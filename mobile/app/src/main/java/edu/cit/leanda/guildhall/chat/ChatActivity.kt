package edu.cit.leanda.guildhall.chat

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.PopupMenu
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.auth.ConversationDto
import edu.cit.leanda.guildhall.auth.RetrofitClient
import edu.cit.leanda.guildhall.auth.UserSearchResultDto
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.launch

class ChatActivity : AppCompatActivity() {
    private lateinit var session: SessionManager
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var conversations: ConversationAdapter
    private lateinit var users: UserSearchAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_chat)
        session = SessionManager(this)
        findViewById<TextView>(R.id.btnBack).setOnClickListener { finish() }
        conversations = ConversationAdapter()
        conversations.onClick = { openConversationScreen(it) }
        conversations.onRemove = { conversations.remove(it) }
        users = UserSearchAdapter { openConversation(it.id) }
        findViewById<RecyclerView>(R.id.recyclerView).layoutManager = LinearLayoutManager(this)
        findViewById<RecyclerView>(R.id.recyclerView).adapter = conversations
        findViewById<RecyclerView>(R.id.searchResults).layoutManager = LinearLayoutManager(this)
        findViewById<RecyclerView>(R.id.searchResults).adapter = users
        setupSearch()
        intent.takeIf { it.hasExtra("otherUserId") }?.getLongExtra("otherUserId", -1L)?.takeIf { it > 0 }?.let { openConversation(it) }
        intent.takeIf { it.hasExtra("conversationId") }?.getLongExtra("conversationId", -1L)?.takeIf { it > 0 }?.let {
            startActivity(Intent(this, ConversationActivity::class.java).putExtra("conversationId", it))
        }
    }

    override fun onResume() {
        super.onResume()
        load()
    }

    private fun setupSearch() {
        val search = findViewById<android.widget.EditText>(R.id.etSearch)
        val runnable = object { var r: Runnable? = null }
        search.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                runnable.r?.let { handler.removeCallbacks(it) }
                runnable.r = Runnable { searchUsers(s?.toString().orEmpty()) }
                handler.postDelayed(runnable.r!!, 300)
            }
        })
    }

    private fun load() {
        val token = session.getToken() ?: return
        findViewById<View>(R.id.progressBar).visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val list = RetrofitClient.apiService.getConversations("Bearer $token").body()?.data ?: emptyList()
                conversations.update(list)
                findViewById<TextView>(R.id.tvEmpty).visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
            } catch (_: Exception) { }
            findViewById<View>(R.id.progressBar).visibility = View.GONE
        }
    }

    private fun searchUsers(query: String) {
        val token = session.getToken() ?: return
        if (query.isBlank()) { findViewById<RecyclerView>(R.id.searchResults).visibility = View.GONE; return }
        lifecycleScope.launch {
            val result = try { RetrofitClient.apiService.searchUsers("Bearer $token", query).body()?.data ?: emptyList() } catch (_: Exception) { emptyList() }
            users.update(result)
            findViewById<RecyclerView>(R.id.searchResults).visibility = if (result.isEmpty()) View.GONE else View.VISIBLE
        }
    }

    private fun openConversation(otherUserId: Long) {
        val token = session.getToken() ?: return
        lifecycleScope.launch {
            val conv = RetrofitClient.apiService.openConversation("Bearer $token", otherUserId).body()?.data ?: return@launch
            openConversationScreen(conv)
        }
    }

    private fun openConversationScreen(conv: ConversationDto) {
        startActivity(Intent(this, ConversationActivity::class.java)
            .putExtra("conversationId", conv.conversationId)
            .putExtra("otherUserId", conv.otherUserId)
            .putExtra("otherUsername", conv.otherUsername))
    }

    private class ConversationAdapter : RecyclerView.Adapter<ConversationAdapter.Holder>() {
        private val data = mutableListOf<ConversationDto>()
        var onClick: ((ConversationDto) -> Unit)? = null
        var onRemove: ((ConversationDto) -> Unit)? = null
        fun update(items: List<ConversationDto>) { data.clear(); data.addAll(items); notifyDataSetChanged() }
        fun remove(item: ConversationDto) { val i = data.indexOf(item); if (i >= 0) { data.removeAt(i); notifyItemRemoved(i) } }
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = Holder(LayoutInflater.from(parent.context).inflate(R.layout.item_conversation, parent, false))
        override fun getItemCount() = data.size
        override fun onBindViewHolder(holder: Holder, position: Int) = holder.bind(data[position], onClick, onRemove)
        class Holder(view: View) : RecyclerView.ViewHolder(view) {
            fun bind(c: ConversationDto, click: ((ConversationDto) -> Unit)?, remove: ((ConversationDto) -> Unit)?) {
                itemView.findViewById<TextView>(R.id.tvAvatar).text = c.otherUsername.take(1).uppercase()
                itemView.findViewById<TextView>(R.id.tvUsername).text = c.otherUsername
                itemView.findViewById<TextView>(R.id.tvPreview).text = if (c.lastMessageType == "SYSTEM") "Quest accepted" else c.lastMessage ?: "No messages yet"
                itemView.findViewById<TextView>(R.id.tvTime).text = c.lastMessageAt?.take(16)?.replace("T", " ") ?: ""
                itemView.findViewById<TextView>(R.id.tvUnread).apply { visibility = if (c.unreadCount > 0) View.VISIBLE else View.GONE; text = c.unreadCount.toString() }
                itemView.setOnClickListener { click?.invoke(c) }
                itemView.setOnLongClickListener { PopupMenu(it.context, it).apply { menu.add("Remove"); setOnMenuItemClickListener { remove?.invoke(c); true }; show() }; true }
            }
        }
    }

    private class UserSearchAdapter(private val click: (UserSearchResultDto) -> Unit) : RecyclerView.Adapter<UserSearchAdapter.Holder>() {
        private var data = listOf<UserSearchResultDto>()
        fun update(items: List<UserSearchResultDto>) { data = items; notifyDataSetChanged() }
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = Holder(LayoutInflater.from(parent.context).inflate(R.layout.item_conversation, parent, false))
        override fun getItemCount() = data.size
        override fun onBindViewHolder(holder: Holder, position: Int) = holder.bind(data[position], click)
        class Holder(view: View) : RecyclerView.ViewHolder(view) {
            fun bind(u: UserSearchResultDto, click: (UserSearchResultDto) -> Unit) {
                itemView.findViewById<TextView>(R.id.tvAvatar).text = u.username.take(1).uppercase()
                itemView.findViewById<TextView>(R.id.tvUsername).text = u.username
                itemView.findViewById<TextView>(R.id.tvPreview).text = u.rank
                itemView.findViewById<TextView>(R.id.tvTime).text = ""
                itemView.findViewById<TextView>(R.id.tvUnread).visibility = View.GONE
                itemView.setOnClickListener { click(u) }
            }
        }
    }
}
