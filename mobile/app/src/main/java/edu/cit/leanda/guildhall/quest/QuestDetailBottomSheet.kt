package edu.cit.leanda.guildhall.quest

import android.app.Dialog
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.google.android.material.button.MaterialButton
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.auth.QuestDto
import java.text.NumberFormat
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

class QuestDetailBottomSheet : BottomSheetDialogFragment() {

    interface OnQuestActionListener {
        fun onAccepted(quest: QuestDto)
        fun onCompleted(quest: QuestDto)
        fun onDeleted(questId: Long)
    }

    private lateinit var quest: QuestDto
    private var currentUserId: Long = -1L
    private var guildId: Long = -1L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        @Suppress("DEPRECATION")
        quest = requireArguments().getSerializable(ARG_QUEST) as QuestDto
        currentUserId = requireArguments().getLong(ARG_CURRENT_USER_ID)
        guildId = requireArguments().getLong(ARG_GUILD_ID)
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        return (super.onCreateDialog(savedInstanceState) as BottomSheetDialog).apply {
            setOnShowListener {
                val sheet = findViewById<View>(com.google.android.material.R.id.design_bottom_sheet)
                sheet?.layoutParams?.height = ViewGroup.LayoutParams.MATCH_PARENT
                sheet?.let { BottomSheetBehavior.from(it).state = BottomSheetBehavior.STATE_EXPANDED }
            }
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.bottom_sheet_quest_detail, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val tvTitle: TextView = view.findViewById(R.id.tvTitle)
        val tvCategory: TextView = view.findViewById(R.id.tvCategory)
        val tvStatus: TextView = view.findViewById(R.id.tvStatus)
        val tvMeta: TextView = view.findViewById(R.id.tvMeta)
        val tvBanner: TextView = view.findViewById(R.id.tvBanner)
        val tvDescription: TextView = view.findViewById(R.id.tvDescription)
        val imgAttachment: ImageView = view.findViewById(R.id.imgAttachment)
        val pdfRow: LinearLayout = view.findViewById(R.id.pdfRow)
        val tvPdfName: TextView = view.findViewById(R.id.tvPdfName)
        val btnDownload: MaterialButton = view.findViewById(R.id.btnDownload)
        val actions: LinearLayout = view.findViewById(R.id.actionContainer)
        val tvReward: TextView = view.findViewById(R.id.tvReward)
        val tvXp: TextView = view.findViewById(R.id.tvXp)

        view.findViewById<TextView>(R.id.btnClose).setOnClickListener { dismiss() }
        tvTitle.text = quest.title
        tvCategory.text = quest.category.uppercase(Locale.getDefault())
        bindStatus(tvStatus, quest.status)
        tvMeta.text = listOfNotNull("Posted by ${quest.postedBy}", quest.guildName, formatDate(quest.createdAt)).joinToString(" · ")
        tvDescription.text = quest.description
        val rewardValue = quest.reward
        tvReward.text = if (quest.questType == "PAID" && rewardValue != null) peso(rewardValue) else "Volunteer"
        tvXp.text = "+${quest.xpReward} XP"

        if (quest.status == "PENDING" && !quest.helperUsername.isNullOrBlank()) {
            tvBanner.visibility = View.VISIBLE
            tvBanner.text = "Accepted by ${quest.helperUsername}"
        } else if (quest.status == "COMPLETED") {
            tvBanner.visibility = View.VISIBLE
            tvBanner.setBackgroundResource(R.drawable.bg_chip_blue)
            tvBanner.setTextColor(android.graphics.Color.rgb(30, 64, 175))
            tvBanner.text = "This quest has been completed!"
        }

        val name = quest.attachmentName.orEmpty()
        val data = quest.attachmentData
        if (!data.isNullOrBlank() && isImage(name)) {
            decodeDataUri(data)?.let {
                imgAttachment.visibility = View.VISIBLE
                imgAttachment.setImageBitmap(it)
                imgAttachment.setOnClickListener {
                    startActivity(Intent(requireContext(), ImageViewerActivity::class.java).putExtra("imageData", data))
                }
            }
        } else if (name.endsWith(".pdf", true)) {
            pdfRow.visibility = View.VISIBLE
            tvPdfName.text = name
            btnDownload.setOnClickListener {
                val uri = Uri.parse(data ?: "")
                startActivity(Intent(Intent.ACTION_VIEW, uri))
            }
        }

        addActions(actions)
    }

    private fun addActions(container: LinearLayout) {
        val listener = parentFragment as? OnQuestActionListener ?: activity as? OnQuestActionListener
        val mine = quest.posterId == currentUserId
        if (!mine && quest.status == "OPEN") {
            container.addView(actionButton("Accept", R.color.primary_green) { listener?.onAccepted(quest); dismiss() })
        }
        if (mine && quest.status == "PENDING") {
            container.addView(actionButton("Done", android.R.color.holo_blue_dark) { listener?.onCompleted(quest); dismiss() })
        }
        if (mine && quest.status == "OPEN") {
            container.addView(actionButton("Delete", R.color.error_red) { listener?.onDeleted(quest.id); dismiss() })
        }
    }

    private fun actionButton(label: String, color: Int, onClick: () -> Unit): MaterialButton {
        return MaterialButton(requireContext()).apply {
            text = label
            setTextColor(android.graphics.Color.WHITE)
            setBackgroundColor(androidx.core.content.ContextCompat.getColor(context, color))
            setOnClickListener { onClick() }
        }
    }

    private fun bindStatus(view: TextView, status: String) {
        view.text = if (status == "PENDING_PAYMENT") "CARD PENDING" else status.replace("_", " ")
        when (status) {
            "OPEN" -> { view.setBackgroundResource(R.drawable.bg_chip_green); view.setTextColor(android.graphics.Color.rgb(22, 101, 52)) }
            "COMPLETED" -> { view.setBackgroundResource(R.drawable.bg_chip_blue); view.setTextColor(android.graphics.Color.rgb(30, 64, 175)) }
            else -> { view.setBackgroundResource(R.drawable.bg_chip_amber); view.setTextColor(android.graphics.Color.rgb(146, 64, 14)) }
        }
    }

    private fun formatDate(value: String?): String? = try {
        value?.let { LocalDateTime.parse(it).format(DateTimeFormatter.ofPattern("MMM d, yyyy")) }
    } catch (_: Exception) { value }

    private fun peso(value: Double): String = NumberFormat.getCurrencyInstance(Locale("en", "PH")).format(value)

    private fun isImage(name: String) = listOf(".jpg", ".jpeg", ".png", ".gif", ".webp").any { name.endsWith(it, true) }

    private fun decodeDataUri(dataUri: String) = try {
        val raw = dataUri.substringAfter(",", dataUri)
        val bytes = Base64.decode(raw, Base64.DEFAULT)
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    } catch (_: Exception) { null }

    companion object {
        private const val ARG_QUEST = "quest"
        private const val ARG_CURRENT_USER_ID = "currentUserId"
        private const val ARG_GUILD_ID = "guildId"

        fun newInstance(quest: QuestDto, currentUserId: Long, guildId: Long) = QuestDetailBottomSheet().apply {
            arguments = Bundle().apply {
                putSerializable(ARG_QUEST, quest)
                putLong(ARG_CURRENT_USER_ID, currentUserId)
                putLong(ARG_GUILD_ID, guildId)
            }
        }
    }
}
