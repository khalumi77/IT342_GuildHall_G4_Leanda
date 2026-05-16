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
import edu.cit.leanda.guildhall.auth.QuestDto
import edu.cit.leanda.guildhall.auth.RetrofitClient
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.launch

class CommissionedQuestsActivity : AppCompatActivity(), QuestDetailBottomSheet.OnQuestActionListener {
    private lateinit var session: SessionManager
    private lateinit var adapter: QuestListAdapter
    private val quests = mutableListOf<QuestDto>()
    private var filter = "ALL"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_commissioned_quests)
        session = SessionManager(this)
        adapter = QuestListAdapter(session.getUserId())
        adapter.onClick = { QuestDetailBottomSheet.newInstance(it, session.getUserId(), it.guildId ?: -1L).show(supportFragmentManager, "detail") }
        adapter.onPay = { pay(it) }
        findViewById<RecyclerView>(R.id.recyclerView).layoutManager = LinearLayoutManager(this)
        findViewById<RecyclerView>(R.id.recyclerView).adapter = adapter
        findViewById<TextView>(R.id.btnBack).setOnClickListener { finish() }
        findViewById<MaterialButton>(R.id.btnRetry).setOnClickListener { load() }
        setupTabs(listOf("All" to "ALL", "Unpaid" to "PENDING_PAYMENT", "Open" to "OPEN", "Pending" to "PENDING", "Completed" to "COMPLETED"))
        load()
    }

    private fun setupTabs(tabs: List<Pair<String, String>>) {
        val row: LinearLayout = findViewById(R.id.tabRow)
        tabs.forEach { (label, value) ->
            row.addView(TextView(this).apply {
                text = label
                setPadding(24, 14, 24, 14)
                setTextColor(android.graphics.Color.rgb(82, 115, 77))
                setBackgroundResource(R.drawable.bg_chip_green)
                setOnClickListener { filter = value; render() }
            })
        }
    }

    private fun load() {
        val token = session.getToken() ?: return
        findViewById<View>(R.id.progressBar).visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.myCommissionedQuests("Bearer $token")
                findViewById<View>(R.id.progressBar).visibility = View.GONE
                if (response.isSuccessful) { quests.clear(); quests.addAll(response.body()?.data ?: emptyList()); render() }
                else showError("Failed to load quests.")
            } catch (e: Exception) { findViewById<View>(R.id.progressBar).visibility = View.GONE; showError(e.message ?: "Failed to load quests.") }
        }
    }

    private fun render() {
        val data = if (filter == "ALL") quests else quests.filter { it.status == filter }
        adapter.update(data)
        findViewById<TextView>(R.id.tvEmpty).text = "No quests for this filter."
        findViewById<TextView>(R.id.tvEmpty).visibility = if (data.isEmpty()) View.VISIBLE else View.GONE
    }

    private fun pay(q: QuestDto) {
        val token = session.getToken() ?: return
        lifecycleScope.launch {
            try {
                val url = RetrofitClient.apiService.createPaymentSession("Bearer $token", q.id).body()?.data?.checkoutUrl
                if (!url.isNullOrBlank()) CustomTabsIntent.Builder().build().launchUrl(this@CommissionedQuestsActivity, Uri.parse(url))
                else Toast.makeText(this@CommissionedQuestsActivity, "Unable to create payment session.", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) { Toast.makeText(this@CommissionedQuestsActivity, e.message, Toast.LENGTH_SHORT).show() }
        }
    }

    private fun showError(message: String) { findViewById<TextView>(R.id.tvError).text = message; findViewById<View>(R.id.errorContainer).visibility = View.VISIBLE }
    override fun onAccepted(quest: QuestDto) {}
    override fun onCompleted(quest: QuestDto) {}
    override fun onDeleted(questId: Long) {}
}
