package edu.cit.leanda.guildhall.quest

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.auth.QuestDto
import edu.cit.leanda.guildhall.auth.RetrofitClient
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

class AcceptedQuestsActivity : AppCompatActivity() {

    private lateinit var session: SessionManager
    private lateinit var adapter: AcceptedQuestAdapter
    private val quests = mutableListOf<QuestDto>()
    private var filter = "ALL"

    // Tab views
    private lateinit var tabAll: TextView
    private lateinit var tabInProgress: TextView
    private lateinit var tabCompleted: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_accepted_quests)
        session = SessionManager(this)

        bindViews()
        setupAdapter()
        setupTabs()
        load()
    }

    private fun bindViews() {
        tabAll        = findViewById(R.id.tabAll)
        tabInProgress = findViewById(R.id.tabInProgress)
        tabCompleted  = findViewById(R.id.tabCompleted)
        findViewById<TextView>(R.id.btnBack).setOnClickListener { finish() }
    }

    private fun setupAdapter() {
        adapter = AcceptedQuestAdapter(session.getUserId()) { quest ->
            QuestDetailBottomSheet
                .newInstance(quest, session.getUserId(), quest.guildId ?: -1L)
                .show(supportFragmentManager, "detail")
        }
        findViewById<RecyclerView>(R.id.recyclerView).layoutManager = LinearLayoutManager(this)
        findViewById<RecyclerView>(R.id.recyclerView).adapter = adapter
    }

    private fun setupTabs() {
        fun setActive(active: TextView, others: List<TextView>) {
            active.setTextColor(getColor(R.color.primary_green))
            active.setBackgroundResource(R.drawable.bg_tab_active)
            others.forEach {
                it.setTextColor(getColor(R.color.text_secondary))
                it.setBackgroundResource(0)
            }
        }

        tabAll.setOnClickListener {
            filter = "ALL"
            setActive(tabAll, listOf(tabInProgress, tabCompleted))
            render()
        }
        tabInProgress.setOnClickListener {
            filter = "PENDING"
            setActive(tabInProgress, listOf(tabAll, tabCompleted))
            render()
        }
        tabCompleted.setOnClickListener {
            filter = "COMPLETED"
            setActive(tabCompleted, listOf(tabAll, tabInProgress))
            render()
        }

        // Default active
        setActive(tabAll, listOf(tabInProgress, tabCompleted))
    }

    private fun load() {
        val token = session.getToken() ?: return
        findViewById<View>(R.id.progressBar).visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.myAcceptedQuests("Bearer $token")
                quests.clear()
                quests.addAll(response.body()?.data ?: emptyList())
            } catch (_: Exception) { }
            finally {
                findViewById<View>(R.id.progressBar).visibility = View.GONE
                render()
            }
        }
    }

    private fun render() {
        val data = when (filter) {
            "PENDING"   -> quests.filter { it.status == "PENDING" }
            "COMPLETED" -> quests.filter { it.status == "COMPLETED" }
            else        -> quests
        }

        // Update stat badges
        val inProgressCount = quests.count { it.status == "PENDING" }
        val completedCount  = quests.count { it.status == "COMPLETED" }
        findViewById<TextView>(R.id.tvInProgress).text = "In Progress: $inProgressCount"
        findViewById<TextView>(R.id.tvCompleted).text  = "Completed: $completedCount"

        // Tab counts
        tabAll.text        = "All (${quests.size})"
        tabInProgress.text = "In Progress ($inProgressCount)"
        tabCompleted.text  = "Completed ($completedCount)"

        adapter.update(data)

        val tvEmpty = findViewById<TextView>(R.id.tvEmpty)
        if (data.isEmpty()) {
            tvEmpty.visibility = View.VISIBLE
            tvEmpty.text = when (filter) {
                "PENDING"   -> "No quests in progress."
                "COMPLETED" -> "No completed quests yet."
                else        -> "You haven't accepted any quests yet.\nHead to a guild to find your first quest!"
            }
        } else {
            tvEmpty.visibility = View.GONE
        }
    }
}

// ── Adapter ───────────────────────────────────────────────────────────────────

class AcceptedQuestAdapter(
    private val currentUserId: Long,
    private val onClick: (QuestDto) -> Unit
) : RecyclerView.Adapter<AcceptedQuestAdapter.Holder>() {

    private var data = listOf<QuestDto>()

    fun update(items: List<QuestDto>) {
        data = items
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_accepted_quest_card, parent, false)
        return Holder(view)
    }

    override fun getItemCount() = data.size

    override fun onBindViewHolder(holder: Holder, position: Int) {
        holder.bind(data[position], onClick)
    }

    class Holder(view: View) : RecyclerView.ViewHolder(view) {
        fun bind(q: QuestDto, onClick: (QuestDto) -> Unit) {
            // Title
            itemView.findViewById<TextView>(R.id.tvTitle).text = q.title

            // Category chip
            itemView.findViewById<TextView>(R.id.tvCategory).text = q.category.uppercase()

            // Guild name
            val guildName = q.guildName ?: "Unknown Guild"
            itemView.findViewById<TextView>(R.id.tvGuildName).text = guildName

            // Commissioner
            val poster = q.posterUsername ?: q.postedBy
            itemView.findViewById<TextView>(R.id.tvCommissioner).text = "by $poster"

            // Description (truncated)
            itemView.findViewById<TextView>(R.id.tvDescription).text = q.description

            // Status badge
            val tvStatus = itemView.findViewById<TextView>(R.id.tvStatus)
            when (q.status) {
                "PENDING" -> {
                    tvStatus.text = "IN PROGRESS"
                    tvStatus.setBackgroundResource(R.drawable.bg_chip_amber)
                    tvStatus.setTextColor(android.graphics.Color.rgb(146, 64, 14))
                }
                "COMPLETED" -> {
                    tvStatus.text = "COMPLETED"
                    tvStatus.setBackgroundResource(R.drawable.bg_chip_blue)
                    tvStatus.setTextColor(android.graphics.Color.rgb(30, 64, 175))
                }
                else -> {
                    tvStatus.text = q.status
                    tvStatus.setBackgroundResource(R.drawable.bg_chip_green)
                    tvStatus.setTextColor(android.graphics.Color.rgb(22, 101, 52))
                }
            }

            // Reward
            val tvReward = itemView.findViewById<TextView>(R.id.tvReward)
            if (q.questType == "PAID" && q.reward != null) {
                val fmt = NumberFormat.getCurrencyInstance(Locale("en", "PH"))
                tvReward.text = fmt.format(q.reward)
                tvReward.setTextColor(android.graphics.Color.parseColor("#34C759"))
            } else {
                tvReward.text = "Volunteer"
                tvReward.setTextColor(android.graphics.Color.parseColor("#52734D"))
            }

            // XP
            itemView.findViewById<TextView>(R.id.tvXp).text = "+${q.xpReward} XP"

            // Attachment indicator
            val tvAttach = itemView.findViewById<TextView>(R.id.tvAttachment)
            if (!q.attachmentName.isNullOrBlank()) {
                tvAttach.visibility = View.VISIBLE
                val icon = if (q.attachmentName.matches(Regex(".*\\.(jpg|jpeg|png|gif|webp)", RegexOption.IGNORE_CASE))) "🖼️" else "📄"
                tvAttach.text = "$icon ${q.attachmentName}"
            } else {
                tvAttach.visibility = View.GONE
            }

            // Date
            val tvDate = itemView.findViewById<TextView>(R.id.tvDate)
            tvDate.text = formatDate(q.createdAt)

            itemView.setOnClickListener { onClick(q) }
        }

        private fun formatDate(dateStr: String?): String {
            if (dateStr.isNullOrBlank()) return ""
            return try {
                val dt = LocalDateTime.parse(dateStr)
                dt.format(DateTimeFormatter.ofPattern("MMM d, yyyy"))
            } catch (_: Exception) { "" }
        }
    }
}