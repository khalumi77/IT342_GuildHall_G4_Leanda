package edu.cit.leanda.guildhall.profile

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.util.Base64
import android.view.View
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.auth.RetrofitClient
import edu.cit.leanda.guildhall.auth.UpdateProfileRequest
import edu.cit.leanda.guildhall.auth.UserDto
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL

class ProfileActivity : AppCompatActivity(), EditSkillsDialog.Listener {
    private lateinit var session: SessionManager
    private var user: UserDto? = null
    private val picker = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri ?: return@registerForActivityResult
        lifecycleScope.launch {
            val base64 = withContext(Dispatchers.IO) {
                val source = contentResolver.openInputStream(uri).use { BitmapFactory.decodeStream(it) }
                val scale = minOf(1f, 800f / maxOf(source.width, source.height).toFloat())
                val bitmap = if (scale < 1f) Bitmap.createScaledBitmap(source, (source.width * scale).toInt(), (source.height * scale).toInt(), true) else source
                val out = ByteArrayOutputStream()
                bitmap.compress(Bitmap.CompressFormat.JPEG, 70, out)
                "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
            }
            updateProfile(UpdateProfileRequest(profilePictureUrl = base64)) { loadAvatar(base64) }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_profile)
        session = SessionManager(this)
        findViewById<TextView>(R.id.btnBack).setOnClickListener { finish() }
        findViewById<TextView>(R.id.btnCamera).setOnClickListener { picker.launch("image/*") }
        findViewById<TextView>(R.id.tabAbout).setOnClickListener { showTab(true) }
        findViewById<TextView>(R.id.tabAccount).setOnClickListener { showTab(false) }
        findViewById<MaterialButton>(R.id.btnEditSkills).setOnClickListener { EditSkillsDialog.newInstance((user?.skills ?: session.getSkills()).toTypedArray()).show(supportFragmentManager, "skills") }
        setupBio()
        loadMe()
    }

    private fun loadMe() {
        val token = session.getToken() ?: return renderFallback()
        lifecycleScope.launch {
            try {
                val fresh = RetrofitClient.apiService.me("Bearer $token").body()?.data?.user
                if (fresh != null) { user = fresh; session.saveUser(fresh) }
            } catch (_: Exception) { }
            render()
        }
    }

    private fun renderFallback() { render() }

    private fun render() {
        val u = user
        val username = u?.username ?: session.getUsername() ?: "Adventurer"
        val level = u?.level ?: session.getLevel()
        val xp = u?.xp ?: session.getXp()
        val rank = u?.rank ?: session.getRank() ?: "Bronze"
        findViewById<TextView>(R.id.tvUsername).text = username
        findViewById<TextView>(R.id.tvInitials).text = username.take(1).uppercase()
        findViewById<TextView>(R.id.tvBadges).text = "Level $level  |  $rank"
        findViewById<android.widget.ProgressBar>(R.id.progressXp).progress = xp % 100
        findViewById<TextView>(R.id.tvXp).text = "${xp % 100} / 100 XP"
        findViewById<TextView>(R.id.tvSkills).text = "Skills: " + ((u?.skills ?: session.getSkills()).ifEmpty { listOf("No skills yet") }.joinToString(", "))
        findViewById<TextView>(R.id.tvBio).text = u?.bio?.takeIf { it.isNotBlank() } ?: "No bio yet."
        findViewById<TextView>(R.id.tvRoleAbout).text = "Role: " + roleLabel(u?.role ?: session.getRole())
        findViewById<TextView>(R.id.tvEmail).text = "Email: ${u?.email ?: session.getEmail() ?: ""}" + if (u?.googleSub != null) "  G" else ""
        findViewById<TextView>(R.id.tvRoleAccount).text = "Role: " + roleLabel(u?.role ?: session.getRole())
        loadAvatar(u?.profilePictureUrl ?: session.getProfilePictureUrl())
    }

    private fun setupBio() {
        val tvBio: TextView = findViewById(R.id.tvBio)
        val etBio: EditText = findViewById(R.id.etBio)
        val counter: TextView = findViewById(R.id.tvBioCounter)
        val buttons: LinearLayout = findViewById(R.id.bioButtons)
        findViewById<MaterialButton>(R.id.btnEditBio).setOnClickListener {
            etBio.setText(tvBio.text)
            tvBio.visibility = View.GONE; etBio.visibility = View.VISIBLE; counter.visibility = View.VISIBLE; buttons.visibility = View.VISIBLE; it.visibility = View.GONE
        }
        findViewById<MaterialButton>(R.id.btnCancelBio).setOnClickListener { render() }
        findViewById<MaterialButton>(R.id.btnSaveBio).setOnClickListener {
            updateProfile(UpdateProfileRequest(bio = etBio.text.toString())) {
                user = user?.copy(bio = etBio.text.toString())
                render()
            }
        }
        etBio.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) { counter.text = "${s?.length ?: 0} / 500" }
        })
    }

    private fun updateProfile(body: UpdateProfileRequest, after: () -> Unit) {
        val token = session.getToken() ?: return
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.updateProfile("Bearer $token", body)
                if (response.isSuccessful) after() else Toast.makeText(this@ProfileActivity, "Profile update failed.", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) { Toast.makeText(this@ProfileActivity, e.message, Toast.LENGTH_SHORT).show() }
        }
    }

    override fun onSkillsSaved(skills: List<String>) {
        val token = session.getToken() ?: return
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.saveSkills("Bearer $token", edu.cit.leanda.guildhall.auth.SkillsRequest(skills))
                response.body()?.data?.user?.let { user = it; session.saveUser(it); render() }
            } catch (e: Exception) { Toast.makeText(this@ProfileActivity, e.message, Toast.LENGTH_SHORT).show() }
        }
    }

    private fun showTab(about: Boolean) {
        findViewById<View>(R.id.aboutPanel).visibility = if (about) View.VISIBLE else View.GONE
        findViewById<View>(R.id.accountPanel).visibility = if (about) View.GONE else View.VISIBLE
    }

    private fun roleLabel(role: String?) = if (role == "ROLE_GUILDMASTER") "Guildmaster" else "Adventurer"

    private fun loadAvatar(value: String?) {
        val image: ImageView = findViewById(R.id.imgAvatar)
        findViewById<TextView>(R.id.tvInitials).visibility = View.VISIBLE
        if (value.isNullOrBlank()) return
        lifecycleScope.launch {
            val bitmap = withContext(Dispatchers.IO) {
                try {
                    if (value.startsWith("data:")) {
                        val bytes = Base64.decode(value.substringAfter(","), Base64.DEFAULT)
                        BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                    } else {
                        val conn = URL(value).openConnection() as HttpURLConnection
                        conn.inputStream.use { BitmapFactory.decodeStream(it) }
                    }
                } catch (_: Exception) { null }
            }
            if (bitmap != null) { image.setImageBitmap(bitmap); findViewById<TextView>(R.id.tvInitials).visibility = View.GONE }
        }
    }
}
