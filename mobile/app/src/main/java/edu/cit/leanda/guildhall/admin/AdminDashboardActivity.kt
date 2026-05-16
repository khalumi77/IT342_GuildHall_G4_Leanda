package edu.cit.leanda.guildhall.admin

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import edu.cit.leanda.guildhall.R

class AdminDashboardActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val text = TextView(this).apply {
            setBackgroundColor(getColor(R.color.background))
            setTextColor(getColor(R.color.text_primary))
            textSize = 20f
            setPadding(32, 64, 32, 32)
            text = "Admin Dashboard"
        }
        setContentView(text)
    }
}
