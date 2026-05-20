package edu.cit.leanda.guildhall.quest

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.auth.PaymentRetrofitClient
import edu.cit.leanda.guildhall.auth.QuestDto
import edu.cit.leanda.guildhall.auth.RetrofitClient
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.launch

class CommissionedQuestsActivity : AppCompatActivity(), QuestDetailBottomSheet.OnQuestActionListener {
    private lateinit var session: SessionManager
    private lateinit var adapter: QuestListAdapter
    private val quests = mutableListOf<QuestDto>()
    private var filter = "ALL"
    private val tabs = mutableMapOf<String, TextView>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_commissioned_quests)
        session = SessionManager(this)
        adapter = QuestListAdapter(session.getUserId())
        adapter.onClick = {
            QuestDetailBottomSheet.newInstance(it, session.getUserId(), it.guildId ?: -1L)
                .show(supportFragmentManager, "detail")
        }
        adapter.onPay = { pay(it) }
        findViewById<RecyclerView>(R.id.recyclerView).layoutManager = LinearLayoutManager(this)
        findViewById<RecyclerView>(R.id.recyclerView).adapter = adapter
        findViewById<TextView>(R.id.btnBack).setOnClickListener { finish() }
        findViewById<MaterialButton>(R.id.btnRetry).setOnClickListener { load() }
        setupTabs()
        load()
    }

    private fun setupTabs() {
        val row: LinearLayout = findViewById(R.id.tabRow)
        listOf("All" to "ALL", "Unpaid" to "PENDING_PAYMENT", "Open" to "OPEN", "Pending" to "PENDING", "Completed" to "COMPLETED").forEach { (label, value) ->
            val tab = TextView(this).apply {
                text = label
                minWidth = resources.displayMetrics.density.let { (112 * it).toInt() }
                gravity = android.view.Gravity.CENTER
                setPadding(18, 14, 18, 14)
                setTextColor(android.graphics.Color.rgb(82, 115, 77))
                textSize = 13f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
                setOnClickListener {
                    filter = value
                    setActiveTab(value)
                    render()
                }
            }
            tabs[value] = tab
            row.addView(tab)
            row.addView(View(this).apply {
                setBackgroundColor(getColor(R.color.divider))
            }, LinearLayout.LayoutParams(1, LinearLayout.LayoutParams.MATCH_PARENT))
        }
        setActiveTab("ALL")
    }

    private fun setActiveTab(activeValue: String) {
        tabs.forEach { (value, tab) ->
            if (value == activeValue) {
                tab.setTextColor(getColor(R.color.primary_green))
                tab.setBackgroundResource(R.drawable.bg_tab_active)
            } else {
                tab.setTextColor(getColor(R.color.text_secondary))
                tab.setBackgroundResource(0)
            }
        }
    }

    private fun load() {
        val token = session.getToken() ?: return
        findViewById<View>(R.id.progressBar).visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.myCommissionedQuests("Bearer $token")
                findViewById<View>(R.id.progressBar).visibility = View.GONE
                if (response.isSuccessful) {
                    quests.clear()
                    quests.addAll(response.body()?.data ?: emptyList())
                    render()
                } else {
                    showError("Failed to load quests.")
                }
            } catch (e: Exception) {
                findViewById<View>(R.id.progressBar).visibility = View.GONE
                showError(e.message ?: "Failed to load quests.")
            }
        }
    }

    private fun render() {
        val data = if (filter == "ALL") quests else quests.filter { it.status == filter }
        findViewById<TextView>(R.id.tvUnpaid).text = "Unpaid: ${quests.count { it.status == "PENDING_PAYMENT" }}"
        findViewById<TextView>(R.id.tvOpen).text = "Open: ${quests.count { it.status == "OPEN" }}"
        findViewById<TextView>(R.id.tvCompleted).text = "Completed: ${quests.count { it.status == "COMPLETED" }}"
        tabs["ALL"]?.text = "All (${quests.size})"
        tabs["PENDING_PAYMENT"]?.text = "Unpaid (${quests.count { it.status == "PENDING_PAYMENT" }})"
        tabs["OPEN"]?.text = "Open (${quests.count { it.status == "OPEN" }})"
        tabs["PENDING"]?.text = "Pending (${quests.count { it.status == "PENDING" }})"
        tabs["COMPLETED"]?.text = "Completed (${quests.count { it.status == "COMPLETED" }})"
        adapter.update(data)
        findViewById<TextView>(R.id.tvEmpty).text = "No quests for this filter."
        findViewById<TextView>(R.id.tvEmpty).visibility = if (data.isEmpty()) View.VISIBLE else View.GONE
    }

    /**
     * Uses PaymentRetrofitClient so the request goes to /api/payments/create-session/{id}
     * instead of /api/v1/payments/create-session/{id} (which returns 500).
     */
    private fun pay(q: QuestDto) {
        val token = session.getToken() ?: return
        lifecycleScope.launch {
            try {
                val response = PaymentRetrofitClient.paymentApiService
                    .createPaymentSession("Bearer $token", q.id)

                if (response.isSuccessful && response.body()?.success == true) {
                    val url = response.body()?.data?.checkoutUrl
                    if (!url.isNullOrBlank()) {
                        CustomTabsIntent.Builder().build()
                            .launchUrl(this@CommissionedQuestsActivity, Uri.parse(url))
                    } else {
                        Toast.makeText(
                            this@CommissionedQuestsActivity,
                            "Unable to create payment session.",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                } else {
                    val msg = response.body()?.error?.message
                        ?: response.errorBody()?.string()
                        ?: "Unable to create payment session."
                    Toast.makeText(this@CommissionedQuestsActivity, msg, Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(
                    this@CommissionedQuestsActivity,
                    e.message ?: "Unable to create payment session.",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }

    private fun showError(message: String) {
        findViewById<TextView>(R.id.tvError).text = message
        findViewById<View>(R.id.errorContainer).visibility = View.VISIBLE
    }

    override fun onAccepted(quest: QuestDto) {}
    override fun onCompleted(quest: QuestDto) {}
    override fun onDeleted(questId: Long) {}
}
