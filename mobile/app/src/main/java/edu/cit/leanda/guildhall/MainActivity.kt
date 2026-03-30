package edu.cit.leanda.guildhall

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Redirect to WelcomeActivity for now
        startActivity(Intent(this, WelcomeActivity::class.java))
        finish()
    }
}