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
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.auth.MessageDto
import edu.cit.leanda.guildhall.auth.RetrofitClient
import edu.cit.leanda.guildhall.auth.SendMessageRequest
import edu.cit.leanda.guildhall.guild.GuildDashboardActivity
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.launch

class ConversationActivity : AppCompatActivity() {
    private lateinit var session: SessionManager
    private lateinit var adapter: MessageAdapter
    private val handler = Handler(Looper.getMainLooper())
    private var running = false
    private var conversationId = -1L
    private var otherUsername = "Adventurer"
    private val poller = object : Runnable {
        override fun run() { if (running) { loadMessages(false); handler.postDelayed(this, 5000) } }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_conversation)
        session = SessionManager(this)
        conversationId = intent.getLongExtra("conversationId", -1L)
        otherUsername = intent.getStringExtra("otherUsername") ?: "Adventurer"
        findViewById<TextView>(R.id.tvUsername).text = otherUsername
        findViewById<TextView>(R.id.tvAvatar).text = otherUsername.take(1).uppercase()
        findViewById<TextView>(R.id.btnBack).setOnClickListener { finish() }
        adapter = MessageAdapter(session.getUserId()) { msg ->
            if (msg.guildId != null) startActivity(Intent(this, GuildDashboardActivity::class.java).putExtra("guildId", msg.guildId).putExtra("guildName", msg.guildName ?: "Guild"))
        }
        findViewById<RecyclerView>(R.id.recyclerView).layoutManager = LinearLayoutManager(this)
        findViewById<RecyclerView>(R.id.recyclerView).adapter = adapter
        setupInput()
        loadMessages(true)
        markRead()
    }

    override fun onResume() { super.onResume(); running = true; handler.postDelayed(poller, 5000) }
    override fun onPause() { running = false; handler.removeCallbacks(poller); super.onPause() }

    private fun setupInput() {
        val input: EditText = findViewById(R.id.etMessage)
        val send: TextView = findViewById(R.id.btnSend)
        send.alpha = 0.4f
        input.hint = "Message $otherUsername..."
        input.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) { send.alpha = if (s.isNullOrBlank()) 0.4f else 1f }
        })
        send.setOnClickListener {
            val content = input.text.toString().trim()
            if (content.isBlank()) return@setOnClickListener
            input.setText("")
            sendMessage(content)
        }
    }

    private fun loadMessages(scroll: Boolean) {
        val token = session.getToken() ?: return
        lifecycleScope.launch {
            val list = try { RetrofitClient.apiService.getMessages("Bearer $token", conversationId).body()?.data ?: emptyList() } catch (_: Exception) { emptyList() }
            adapter.merge(list)
            if (scroll) findViewById<RecyclerView>(R.id.recyclerView).scrollToPosition(maxOf(0, adapter.itemCount - 1))
        }
    }

    private fun markRead() {
        val token = session.getToken() ?: return
        lifecycleScope.launch { try { RetrofitClient.apiService.markAsRead("Bearer $token", conversationId) } catch (_: Exception) {} }
    }

    private fun sendMessage(content: String) {
        val token = session.getToken() ?: return
        val temp = MessageDto(-System.currentTimeMillis(), conversationId, session.getUserId(), session.getUsername() ?: "Me", null, content, "TEXT", null, null, null, null, false, null)
        adapter.add(temp)
        findViewById<RecyclerView>(R.id.recyclerView).scrollToPosition(adapter.itemCount - 1)
        lifecycleScope.launch {
            val real = try { RetrofitClient.apiService.sendMessage("Bearer $token", conversationId, SendMessageRequest(content)).body()?.data } catch (_: Exception) { null }
            if (real != null) adapter.replace(temp.id, real) else adapter.remove(temp.id)
        }
    }

    private class MessageAdapter(private val me: Long, private val systemClick: (MessageDto) -> Unit) : RecyclerView.Adapter<MessageAdapter.Holder>() {
        private val data = mutableListOf<MessageDto>()
        fun merge(items: List<MessageDto>) { items.forEach { incoming -> if (data.none { it.id == incoming.id }) data.add(incoming) }; data.sortBy { it.id }; notifyDataSetChanged() }
        fun add(item: MessageDto) { data.add(item); notifyItemInserted(data.lastIndex) }
        fun replace(id: Long, item: MessageDto) { val i = data.indexOfFirst { it.id == id }; if (i >= 0) { data[i] = item; notifyItemChanged(i) } }
        fun remove(id: Long) { val i = data.indexOfFirst { it.id == id }; if (i >= 0) { data.removeAt(i); notifyItemRemoved(i) } }
        override fun getItemViewType(position: Int): Int = if (data[position].messageType == "SYSTEM") 2 else if (data[position].senderId == me) 0 else 1
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
            val layout = when (viewType) { 0 -> R.layout.item_message_mine; 1 -> R.layout.item_message_other; else -> R.layout.item_message_system }
            return Holder(LayoutInflater.from(parent.context).inflate(layout, parent, false))
        }
        override fun getItemCount() = data.size
        override fun onBindViewHolder(holder: Holder, position: Int) = holder.bind(data[position], systemClick)
        class Holder(view: View) : RecyclerView.ViewHolder(view) {
            fun bind(m: MessageDto, systemClick: (MessageDto) -> Unit) {
                if (m.messageType == "SYSTEM") {
                    itemView.findViewById<TextView>(R.id.tvQuestTitle).text = m.questTitle ?: "Quest"
                    itemView.findViewById<TextView>(R.id.tvGuildName).text = m.guildName ?: "Guild"
                    itemView.findViewById<TextView>(R.id.tvContent).text = m.content
                    itemView.setOnClickListener { systemClick(m) }
                } else itemView.findViewById<TextView>(R.id.tvContent).text = m.content
            }
        }
    }
}
