package edu.cit.leanda.guildhall.quest

import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.auth.RetrofitClient
import edu.cit.leanda.guildhall.auth.QuestDto
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.launch

class AcceptedQuestsActivity : AppCompatActivity() {
    private lateinit var session: SessionManager
    private lateinit var adapter: QuestListAdapter
    private val quests = mutableListOf<QuestDto>()
    private var filter = "ALL"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_accepted_quests)
        session = SessionManager(this)
        adapter = QuestListAdapter(session.getUserId(), readOnly = true)
        adapter.onClick = { QuestDetailBottomSheet.newInstance(it, session.getUserId(), it.guildId ?: -1L).show(supportFragmentManager, "detail") }
        findViewById<RecyclerView>(R.id.recyclerView).layoutManager = LinearLayoutManager(this)
        findViewById<RecyclerView>(R.id.recyclerView).adapter = adapter
        findViewById<TextView>(R.id.btnBack).setOnClickListener { finish() }
        setupTabs()
        load()
    }

    private fun setupTabs() {
        val row: LinearLayout = findViewById(R.id.tabRow)
        listOf("All" to "ALL", "In Progress" to "PENDING", "Completed" to "COMPLETED").forEach { (label, value) ->
            row.addView(TextView(this).apply {
                text = label
                setPadding(24, 14, 24, 14)
                setTextColor(android.graphics.Color.rgb(82, 115, 77))
                setBackgroundResource(R.drawable.bg_chip_green)
                setOnClickListener { filter = value; render() }
            }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        }
    }

    private fun load() {
        val token = session.getToken() ?: return
        findViewById<View>(R.id.progressBar).visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.myAcceptedQuests("Bearer $token")
                quests.clear()
                quests.addAll(response.body()?.data ?: emptyList())
                findViewById<View>(R.id.progressBar).visibility = View.GONE
                render()
            } catch (_: Exception) { findViewById<View>(R.id.progressBar).visibility = View.GONE }
        }
    }

    private fun render() {
        val data = if (filter == "ALL") quests else quests.filter { it.status == filter }
        findViewById<TextView>(R.id.tvInProgress).text = "In Progress: ${quests.count { it.status == "PENDING" }}"
        findViewById<TextView>(R.id.tvCompleted).text = "Completed: ${quests.count { it.status == "COMPLETED" }}"
        adapter.update(data)
        findViewById<TextView>(R.id.tvEmpty).text = "No accepted quests here."
        findViewById<TextView>(R.id.tvEmpty).visibility = if (data.isEmpty()) View.VISIBLE else View.GONE
    }
}
