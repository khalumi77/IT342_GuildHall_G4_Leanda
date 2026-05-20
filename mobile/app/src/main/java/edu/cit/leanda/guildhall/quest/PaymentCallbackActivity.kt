package edu.cit.leanda.guildhall.quest

import android.content.Intent
import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.auth.PaymentRetrofitClient
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.launch

class PaymentCallbackActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val text = TextView(this).apply {
            setBackgroundColor(getColor(R.color.background))
            setTextColor(getColor(R.color.text_primary))
            textSize = 18f
            setPadding(32, 96, 32, 32)
            text = "Checking payment..."
        }
        setContentView(text)

        val questId = intent?.data?.getQueryParameter("quest_id")?.toLongOrNull()
        val status = intent?.data?.lastPathSegment
        if (questId == null || status == "cancel") {
            openCommissioned()
            return
        }

        val token = SessionManager(this).getToken()
        if (token.isNullOrBlank()) {
            openCommissioned()
            return
        }

        lifecycleScope.launch {
            try {
                PaymentRetrofitClient.paymentApiService.verifyPayment("Bearer $token", questId)
            } catch (_: Exception) {
            } finally {
                openCommissioned()
            }
        }
    }

    private fun openCommissioned() {
        startActivity(Intent(this, CommissionedQuestsActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        })
        finish()
    }
}
