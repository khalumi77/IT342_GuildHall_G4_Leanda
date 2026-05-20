package edu.cit.leanda.guildhall.quest

import android.app.Dialog
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.text.Editable
import android.text.TextWatcher
import android.util.Base64
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.google.android.material.button.MaterialButton
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.auth.CreateQuestRequest
import edu.cit.leanda.guildhall.auth.QuestDto
import edu.cit.leanda.guildhall.auth.RetrofitClient
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream

class CommissionQuestBottomSheet : BottomSheetDialogFragment() {

    interface OnQuestCreatedListener {
        fun onQuestCreated(quest: QuestDto)
    }

    private var guildId: Long = -1L
    private var attachmentName: String? = null
    private var attachmentBase64: String? = null   // base64 data URI stored here
    private lateinit var tvAttachment: TextView

    private val picker = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri -> uri?.let { prepareAttachment(it) } }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        guildId = requireArguments().getLong(ARG_GUILD_ID)
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        return (super.onCreateDialog(savedInstanceState) as BottomSheetDialog).apply {
            setOnShowListener {
                val sheet = findViewById<View>(com.google.android.material.R.id.design_bottom_sheet)
                sheet?.layoutParams?.height = ViewGroup.LayoutParams.MATCH_PARENT
                sheet?.let {
                    BottomSheetBehavior.from(it).apply {
                        state = BottomSheetBehavior.STATE_EXPANDED
                        isDraggable = false
                        skipCollapsed = true
                    }
                }
            }
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.bottom_sheet_commission_quest, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val etTitle: EditText       = view.findViewById(R.id.etTitle)
        val etDescription: EditText = view.findViewById(R.id.etDescription)
        val tvCounter: TextView     = view.findViewById(R.id.tvCounter)
        val rgReward: RadioGroup    = view.findViewById(R.id.rgReward)
        val etReward: EditText      = view.findViewById(R.id.etReward)
        tvAttachment                = view.findViewById(R.id.tvAttachment)

        view.findViewById<TextView>(R.id.btnClose).setOnClickListener { dismiss() }
        view.findViewById<MaterialButton>(R.id.btnCancel).setOnClickListener { dismiss() }

        view.findViewById<MaterialButton>(R.id.btnUpload).setOnClickListener {
            picker.launch(arrayOf("image/*", "application/pdf"))
        }

        rgReward.setOnCheckedChangeListener { _, checkedId ->
            etReward.visibility = if (checkedId == R.id.rbPayment) View.VISIBLE else View.GONE
        }

        etDescription.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                tvCounter.text = "${s?.length ?: 0} / 1000"
            }
        })

        view.findViewById<MaterialButton>(R.id.btnPost).setOnClickListener {
            submit(view, etTitle, etDescription, etReward)
        }
    }

    // ── Submit ────────────────────────────────────────────────────────────────

    private fun submit(
        root: View,
        etTitle: EditText,
        etDescription: EditText,
        etReward: EditText
    ) {
        val title       = etTitle.text.toString().trim()
        val description = etDescription.text.toString().trim()

        if (title.isBlank() || description.isBlank()) {
            Toast.makeText(requireContext(), "Title and description are required.", Toast.LENGTH_SHORT).show()
            return
        }

        val token = SessionManager(requireContext()).getToken() ?: return

        val categoryId = root.findViewById<RadioGroup>(R.id.rgCategory).checkedRadioButtonId
        val category   = root.findViewById<RadioButton>(categoryId).text.toString()
        val paid       = root.findViewById<RadioGroup>(R.id.rgReward).checkedRadioButtonId == R.id.rbPayment
        val reward     = if (paid) etReward.text.toString().toDoubleOrNull() else null

        // attachmentBase64 is the full data URI (e.g. "data:image/jpeg;base64,...")
        // attachmentName   is the original filename
        val body = CreateQuestRequest(
            title           = title,
            category        = category,
            description     = description,
            questType       = if (paid) "PAID" else "VOLUNTEER",
            reward          = reward,
            xpReward        = 20,
            attachmentName  = attachmentName,
            attachmentPath  = attachmentBase64   // backend stores this as TEXT
        )

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.createQuest(
                    "Bearer $token", guildId, body
                )
                val quest = response.body()?.data
                if (response.isSuccessful && response.body()?.success == true && quest != null) {
                    (activity as? OnQuestCreatedListener)?.onQuestCreated(quest)
                    dismiss()
                } else {
                    val msg = response.body()?.error?.message ?: "Unable to post quest."
                    Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(
                    requireContext(),
                    e.message ?: "Unable to post quest.",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }

    // ── Attachment preparation ────────────────────────────────────────────────

    /**
     * Reads the chosen file, compresses images, converts everything to a base64
     * data URI, and stores it in [attachmentBase64].
     *
     * The backend column is TEXT so it can hold the full data URI.
     * 500 KB limit (after compression) keeps request size reasonable.
     */
    private fun prepareAttachment(uri: Uri) {
        lifecycleScope.launch {
            try {
                val name = queryFileName(uri) ?: "attachment"
                val mime = requireContext().contentResolver.getType(uri).orEmpty()

                val dataUri: String = withContext(Dispatchers.IO) {
                    when {
                        mime.startsWith("image/") -> encodeImage(uri)
                        mime == "application/pdf" -> encodeGeneric(uri, mime, maxBytes = 500 * 1024)
                        else                      -> encodeGeneric(uri, mime, maxBytes = 500 * 1024)
                    }
                }

                attachmentName   = name
                attachmentBase64 = dataUri

                tvAttachment.visibility = View.VISIBLE
                tvAttachment.text       = "$name  ✕"
                tvAttachment.setOnClickListener {
                    attachmentName   = null
                    attachmentBase64 = null
                    tvAttachment.visibility = View.GONE
                }
            } catch (e: Exception) {
                Toast.makeText(
                    requireContext(),
                    e.message ?: "Attachment failed.",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }

    /** Compress image → JPEG → base64 data URI. Max 500 KB after compression. */
    private fun encodeImage(uri: Uri): String {
        val source = requireContext().contentResolver.openInputStream(uri)
            .use { BitmapFactory.decodeStream(it) }
            ?: throw IllegalArgumentException("Could not read image.")

        // Scale down to max 800 px on the longest edge
        val maxPx = 800f
        val scale = minOf(1f, maxPx / maxOf(source.width, source.height).toFloat())
        val bitmap = if (scale < 1f) {
            Bitmap.createScaledBitmap(
                source,
                (source.width  * scale).toInt(),
                (source.height * scale).toInt(),
                true
            )
        } else source

        // Try quality 70 first; if still too large reduce further
        var quality = 70
        var out = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, out)

        while (out.size() > 500 * 1024 && quality > 30) {
            quality -= 10
            out = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, out)
        }

        if (out.size() > 500 * 1024) {
            throw IllegalArgumentException("Image is too large even after compression (>500 KB). Please choose a smaller image.")
        }

        val encoded = Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
        return "data:image/jpeg;base64,$encoded"
    }

    /** Read raw bytes → base64 data URI. Enforces [maxBytes]. */
    private fun encodeGeneric(uri: Uri, mime: String, maxBytes: Int): String {
        val bytes = requireContext().contentResolver.openInputStream(uri)
            ?.readBytes()
            ?: throw IllegalArgumentException("Could not read file.")

        if (bytes.size > maxBytes) {
            throw IllegalArgumentException(
                "File must be ${maxBytes / 1024} KB or smaller (current: ${bytes.size / 1024} KB)."
            )
        }

        val encoded = Base64.encodeToString(bytes, Base64.NO_WRAP)
        val safeMime = mime.ifBlank { "application/octet-stream" }
        return "data:$safeMime;base64,$encoded"
    }

    private fun queryFileName(uri: Uri): String? =
        requireContext().contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val col = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (cursor.moveToFirst() && col >= 0) cursor.getString(col) else null
        }

    companion object {
        private const val ARG_GUILD_ID = "guildId"

        fun newInstance(guildId: Long) = CommissionQuestBottomSheet().apply {
            arguments = Bundle().apply { putLong(ARG_GUILD_ID, guildId) }
        }
    }
}