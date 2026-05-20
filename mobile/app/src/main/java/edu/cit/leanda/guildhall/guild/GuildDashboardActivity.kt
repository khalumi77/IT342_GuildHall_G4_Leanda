package edu.cit.leanda.guildhall.guild

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.google.android.material.snackbar.Snackbar
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.auth.QuestDto
import edu.cit.leanda.guildhall.auth.RetrofitClient
import edu.cit.leanda.guildhall.chat.ChatActivity
import edu.cit.leanda.guildhall.quest.CommissionQuestBottomSheet
import edu.cit.leanda.guildhall.quest.QuestDetailBottomSheet
import edu.cit.leanda.guildhall.util.GuildHallNavbar
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

class GuildDashboardActivity : AppCompatActivity(), QuestDetailBottomSheet.OnQuestActionListener, CommissionQuestBottomSheet.OnQuestCreatedListener {

    private lateinit var session: SessionManager
    private lateinit var adapter: QuestAdapter
    private val quests = mutableListOf<QuestDto>()
    private var filter = "ALL"
    private var guildId = -1L
    private var guildName = "Guild"
    private var currentUserId = -1L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_guild_dashboard)
        session = SessionManager(this)
        guildId = intent.getLongExtra("guildId", -1L)
        guildName = intent.getStringExtra("guildName") ?: "Guild"
        currentUserId = session.getUserId()

        findViewById<TextView>(R.id.tvGuildName).text = guildName
        findViewById<TextView>(R.id.btnBack).setOnClickListener { finish() }
        GuildHallNavbar.setup(this, findViewById(R.id.btnChat), findViewById(R.id.btnProfile))
        findViewById<View>(R.id.fabCommission).setOnClickListener { CommissionQuestBottomSheet.newInstance(guildId).show(supportFragmentManager, "commission") }
        findViewById<MaterialButton>(R.id.btnRetry).setOnClickListener { loadQuests() }

        adapter = QuestAdapter(currentUserId)
        adapter.onClick = { openDetail(it) }
        adapter.onAccept = { acceptQuest(it) }
        adapter.onComplete = { completeQuest(it) }
        adapter.onDelete = { confirmDelete(it) }
        findViewById<RecyclerView>(R.id.recyclerView).layoutManager = LinearLayoutManager(this)
        findViewById<RecyclerView>(R.id.recyclerView).adapter = adapter
        listOf(R.id.tabAll to "ALL", R.id.tabOpen to "OPEN", R.id.tabPending to "PENDING").forEach { (id, value) ->
            findViewById<TextView>(id).setOnClickListener { filter = value; render() }
        }
        loadWisdom()
        refreshCurrentUserThenLoad()
    }

    private fun loadWisdom() {
        val token = session.getToken() ?: return
        lifecycleScope.launch {
            try {
                val wisdom = RetrofitClient.apiService.getWisdom("Bearer $token").body()?.data
                findViewById<TextView>(R.id.tvQuote).text = "\"${wisdom?.text ?: "The secret of getting ahead is getting started."}\""
                findViewById<TextView>(R.id.tvQuoteAuthor).text = "- ${wisdom?.author ?: "Mark Twain"}"
            } catch (_: Exception) {
                findViewById<TextView>(R.id.tvQuote).text = "\"The secret of getting ahead is getting started.\""
                findViewById<TextView>(R.id.tvQuoteAuthor).text = "- Mark Twain"
            }
        }
    }

    private fun refreshCurrentUserThenLoad() {
        val token = session.getToken() ?: return
        lifecycleScope.launch {
            try {
                RetrofitClient.apiService.me("Bearer $token").body()?.data?.user?.let {
                    session.saveUser(it)
                    currentUserId = it.id
                    adapter.currentUserId = it.id
                }
            } catch (_: Exception) { }
            loadQuests()
        }
    }

    private fun loadQuests() {
        val token = session.getToken() ?: return
        findViewById<View>(R.id.progressBar).visibility = View.VISIBLE
        findViewById<View>(R.id.errorContainer).visibility = View.GONE
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.getQuests("Bearer $token", guildId)
                findViewById<View>(R.id.progressBar).visibility = View.GONE
                if (response.isSuccessful && response.body()?.success == true) {
                    quests.clear()
                    quests.addAll((response.body()?.data ?: emptyList()).filter { it.status != "CANCELLED" && it.status != "COMPLETED" })
                    render()
                } else showError(response.body()?.error?.message ?: "Failed to load quests.")
            } catch (e: Exception) {
                findViewById<View>(R.id.progressBar).visibility = View.GONE
                showError(e.message ?: "Failed to load quests.")
            }
        }
    }

    private fun render() {
        val data = when (filter) {
            "OPEN" -> quests.filter { it.status == "OPEN" }
            "PENDING" -> quests.filter { it.status == "PENDING" || it.status == "PENDING_PAYMENT" }
            else -> quests
        }
        adapter.update(data)
        findViewById<TextView>(R.id.tvEmpty).visibility = if (data.isEmpty()) View.VISIBLE else View.GONE
        findViewById<RecyclerView>(R.id.recyclerView).visibility = if (data.isEmpty()) View.GONE else View.VISIBLE
    }

    private fun openDetail(quest: QuestDto) {
        QuestDetailBottomSheet.newInstance(quest, currentUserId, guildId).show(supportFragmentManager, "questDetail")
    }

    override fun onAccepted(quest: QuestDto) = acceptQuest(quest)
    override fun onCompleted(quest: QuestDto) = completeQuest(quest)
    override fun onDeleted(questId: Long) = quests.firstOrNull { it.id == questId }?.let { confirmDelete(it) } ?: Unit
    override fun onQuestCreated(quest: QuestDto) { quests.add(0, quest); render(); Snackbar.make(findViewById(R.id.recyclerView), "Quest posted.", Snackbar.LENGTH_SHORT).show() }

    private fun acceptQuest(quest: QuestDto) {
        val token = session.getToken() ?: return
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.acceptQuest("Bearer $token", guildId, quest.id)
                val updated = response.body()?.data
                if (response.isSuccessful && updated != null) {
                    replaceQuest(updated)
                    showAcceptedDialog(updated)
                } else Toast.makeText(this@GuildDashboardActivity, response.body()?.error?.message ?: "Unable to accept quest.", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) { Toast.makeText(this@GuildDashboardActivity, e.message, Toast.LENGTH_SHORT).show() }
        }
    }

    private fun completeQuest(quest: QuestDto) {
        val token = session.getToken() ?: return
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.completeQuest("Bearer $token", guildId, quest.id)
                if (response.isSuccessful) {
                    quests.removeAll { it.id == quest.id }
                    render()
                    Snackbar.make(findViewById(R.id.recyclerView), "Quest completed.", Snackbar.LENGTH_SHORT).show()
                }
            } catch (e: Exception) { showError(e.message ?: "Unable to complete quest.") }
        }
    }

    private fun confirmDelete(quest: QuestDto) {
        AlertDialog.Builder(this).setTitle("Delete quest?").setMessage(quest.title)
            .setPositiveButton("Delete") { _, _ -> deleteQuest(quest) }
            .setNegativeButton("Cancel", null).show()
    }

    private fun deleteQuest(quest: QuestDto) {
        val token = session.getToken() ?: return
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.deleteQuest("Bearer $token", guildId, quest.id)
                if (response.isSuccessful) {
                    quests.removeAll { it.id == quest.id }
                    render()
                }
            } catch (e: Exception) { showError(e.message ?: "Unable to delete quest.") }
        }
    }

    private fun replaceQuest(quest: QuestDto) {
        val index = quests.indexOfFirst { it.id == quest.id }
        if (index >= 0) quests[index] = quest
        render()
    }

    private fun showAcceptedDialog(quest: QuestDto) {
        AlertDialog.Builder(this)
            .setTitle("Quest Accepted!")
            .setMessage("${quest.title}\n\nYou've taken on this quest. It will appear in your Accepted Quests.")
            .setPositiveButton("Open Chat") { _, _ -> startActivity(Intent(this, ChatActivity::class.java).putExtra("otherUserId", quest.posterId)) }
            .setNegativeButton("Not Now", null)
            .show()
    }

    private fun showError(message: String) {
        findViewById<TextView>(R.id.tvError).text = message
        findViewById<View>(R.id.errorContainer).visibility = View.VISIBLE
    }

    private class QuestAdapter(var currentUserId: Long) : RecyclerView.Adapter<QuestAdapter.Holder>() {
        var data = listOf<QuestDto>()
        var onClick: ((QuestDto) -> Unit)? = null
        var onAccept: ((QuestDto) -> Unit)? = null
        var onComplete: ((QuestDto) -> Unit)? = null
        var onDelete: ((QuestDto) -> Unit)? = null
        fun update(items: List<QuestDto>) { data = items; notifyDataSetChanged() }
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = Holder(LayoutInflater.from(parent.context).inflate(R.layout.item_quest_card, parent, false))
        override fun getItemCount() = data.size
        override fun onBindViewHolder(holder: Holder, position: Int) = holder.bind(data[position], currentUserId, onClick, onAccept, onComplete, onDelete)

        class Holder(view: View) : RecyclerView.ViewHolder(view) {
            fun bind(q: QuestDto, me: Long, click: ((QuestDto) -> Unit)?, accept: ((QuestDto) -> Unit)?, complete: ((QuestDto) -> Unit)?, delete: ((QuestDto) -> Unit)?) {
                itemView.findViewById<TextView>(R.id.tvTitle).text = q.title
                itemView.findViewById<TextView>(R.id.tvCategory).text = q.category.uppercase()
                itemView.findViewById<TextView>(R.id.tvPostedBy).text = "Posted by ${q.postedBy}"
                itemView.findViewById<TextView>(R.id.tvDescription).text = q.description
                val rewardValue = q.reward
                itemView.findViewById<TextView>(R.id.tvReward).text = if (q.questType == "PAID" && rewardValue != null) NumberFormat.getCurrencyInstance(Locale("en", "PH")).format(rewardValue) else "Volunteer"
                itemView.findViewById<TextView>(R.id.tvXp).text = "+${q.xpReward} XP"
                bindStatus(itemView.findViewById(R.id.tvStatus), q.status)
                val primary = itemView.findViewById<MaterialButton>(R.id.btnPrimary)
                val badge = itemView.findViewById<TextView>(R.id.tvBadge)
                val del = itemView.findViewById<TextView>(R.id.btnDelete)
                primary.visibility = View.GONE; badge.visibility = View.GONE; del.visibility = View.GONE
                val mine = q.posterId == me
                if (mine && q.status == "PENDING") { primary.text = "Done"; primary.visibility = View.VISIBLE; primary.setOnClickListener { complete?.invoke(q) } }
                if (!mine && q.status == "OPEN" && q.acceptedByMe != true) { primary.text = "Accept"; primary.visibility = View.VISIBLE; primary.setOnClickListener { accept?.invoke(q) } }
                if (q.acceptedByMe == true) { badge.text = "My Quest"; badge.visibility = View.VISIBLE }
                if (!mine && q.status == "PENDING" && q.acceptedByMe != true) { badge.text = "Taken"; badge.visibility = View.VISIBLE }
                if (mine) { del.visibility = View.VISIBLE; del.setOnClickListener { delete?.invoke(q) } }
                itemView.setOnClickListener { click?.invoke(q) }
            }
            private fun bindStatus(view: TextView, status: String) {
                view.text = if (status == "PENDING_PAYMENT") "CARD PENDING" else status
                when (status) {
                    "OPEN" -> { view.setBackgroundResource(R.drawable.bg_chip_green); view.setTextColor(android.graphics.Color.rgb(22, 101, 52)) }
                    else -> { view.setBackgroundResource(R.drawable.bg_chip_amber); view.setTextColor(android.graphics.Color.rgb(146, 64, 14)) }
                }
            }
        }
    }
}
