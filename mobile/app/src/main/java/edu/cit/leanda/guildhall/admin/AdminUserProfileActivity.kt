package edu.cit.leanda.guildhall.admin

import android.graphics.BitmapFactory
import android.os.Bundle
import android.util.Base64
import android.view.Gravity
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

class AdminUserProfileActivity : AppCompatActivity() {

    private lateinit var avatar: ImageView
    private lateinit var initials: TextView
    private lateinit var progress: ProgressBar
    private lateinit var content: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        buildLayout()
        loadUser()
    }

    private fun buildLayout() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(getColor(R.color.background))
        }
        val nav = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setBackgroundColor(getColor(R.color.panel_bg))
            setPadding(16, 0, 16, 0)
            minimumHeight = (56 * resources.displayMetrics.density).toInt()
        }
        nav.addView(TextView(this).apply {
            text = "<"
            setTextColor(getColor(R.color.surface_white))
            textSize = 24f
            gravity = Gravity.CENTER
            setOnClickListener { finish() }
        }, LinearLayout.LayoutParams((42 * resources.displayMetrics.density).toInt(), (56 * resources.displayMetrics.density).toInt()))
        nav.addView(TextView(this).apply {
            text = "Adventurer Profile"
            setTextColor(getColor(R.color.surface_white))
            textSize = 19f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))

        progress = ProgressBar(this).apply { visibility = View.GONE }
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 28, 24, 24)
        }
        avatar = ImageView(this).apply {
            setBackgroundResource(R.drawable.bg_chip_green)
            scaleType = ImageView.ScaleType.CENTER_CROP
        }
        initials = TextView(this).apply {
            gravity = Gravity.CENTER
            setTextColor(android.graphics.Color.rgb(22, 101, 52))
            textSize = 24f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        }
        root.addView(nav)
        root.addView(progress, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 8))
        root.addView(content, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT))
        setContentView(root)
    }

    private fun loadUser() {
        val token = SessionManager(this).getToken() ?: return
        val userId = intent.getLongExtra("userId", -1L)
        if (userId <= 0) return
        progress.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val user = AdminRetrofitClient.adminApiService.getUser("Bearer $token", userId).body()?.data
                if (user != null) render(user)
            } finally {
                progress.visibility = View.GONE
            }
        }
    }

    private fun render(user: AdminUserDto) {
        content.removeAllViews()
        val avatarFrame = android.widget.FrameLayout(this)
        val size = (84 * resources.displayMetrics.density).toInt()
        avatarFrame.addView(avatar, android.widget.FrameLayout.LayoutParams(size, size, Gravity.CENTER))
        avatarFrame.addView(initials, android.widget.FrameLayout.LayoutParams(size, size, Gravity.CENTER))
        initials.text = user.username.take(1).uppercase()
        content.addView(avatarFrame, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, size))

        content.addView(label(user.username, 22f, true, Gravity.CENTER, R.color.text_primary))
        content.addView(label("${user.rank ?: "Bronze"}  |  Level ${user.level}", 14f, true, Gravity.CENTER, R.color.secondary_green))
        content.addView(card("Email", user.email))
        content.addView(card("Role", if (user.role == "ROLE_GUILDMASTER") "Guildmaster" else "Adventurer"))
        content.addView(card("XP", "${user.xp} XP"))
        content.addView(card("Skills", user.skills?.joinToString(", ").takeUnless { it.isNullOrBlank() } ?: "No skills listed"))
        content.addView(card("Bio", user.bio?.takeIf { it.isNotBlank() } ?: "No bio yet."))
        loadAvatar(user.profilePictureUrl)
    }

    private fun label(textValue: String, size: Float, bold: Boolean, gravityValue: Int, color: Int): TextView {
        return TextView(this).apply {
            text = textValue
            textSize = size
            gravity = gravityValue
            setTextColor(getColor(color))
            if (bold) setTypeface(typeface, android.graphics.Typeface.BOLD)
            setPadding(0, 8, 0, 4)
        }
    }

    private fun card(title: String, value: String): TextView {
        return TextView(this).apply {
            text = "$title\n$value"
            setTextColor(getColor(R.color.text_primary))
            textSize = 14f
            setBackgroundResource(R.drawable.bg_white_card)
            setPadding(18, 14, 18, 14)
            val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            lp.setMargins(0, 12, 0, 0)
            layoutParams = lp
        }
    }

    private fun loadAvatar(value: String?) {
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
                } catch (_: Exception) {
                    null
                }
            }
            if (bitmap != null) {
                avatar.setImageBitmap(bitmap)
                initials.visibility = View.GONE
            }
        }
    }
}
