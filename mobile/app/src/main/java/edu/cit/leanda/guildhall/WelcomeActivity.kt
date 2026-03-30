package edu.cit.leanda.guildhall

import android.content.Intent
import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import edu.cit.leanda.guildhall.util.SessionManager

class WelcomeActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_welcome)

        val sessionManager = SessionManager(this)

        // Show the logged-in username
        val tvUsername = findViewById<TextView>(R.id.tvUsername)
        tvUsername.text = sessionManager.getUsername() ?: "adventurer"

        // Logout
        findViewById<TextView>(R.id.btnLogout).setOnClickListener {
            sessionManager.clearSession()
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }
    }
}