package edu.cit.leanda.guildhall.admin

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.auth.RetrofitClient
import edu.cit.leanda.guildhall.guild.GuildDashboardActivity
import edu.cit.leanda.guildhall.guild.GuildsActivity
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.launch

// ── Simple data classes ───────────────────────────────────────────────────────

data class AdminGuild(
    val id: Long,
    val name: String,
    val description: String,
    val memberCount: Int,
    val questCount: Int
)

data class AdminUser(
    val id: Long,
    val username: String,
    val email: String,
    val role: String,
    val level: Int,
    val rank: String
)

// ── Activity ──────────────────────────────────────────────────────────────────

class AdminDashboardActivity : AppCompatActivity() {

    private lateinit var session: SessionManager

    // Views
    private lateinit var tabGuilds: TextView
    private lateinit var tabUsers: TextView
    private lateinit var recyclerView: RecyclerView
    private lateinit var progressBar: ProgressBar
    private lateinit var tvEmpty: TextView
    private lateinit var tvTotalUsers: TextView
    private lateinit var tvTotalGuilds: TextView
    private lateinit var btnSwitchView: MaterialButton
    private lateinit var btnCreateGuild: MaterialButton

    private val guilds = mutableListOf<AdminGuild>()
    private val users  = mutableListOf<AdminUser>()
    private var activeTab = "guilds"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_admin_dashboard)
        session = SessionManager(this)

        bindViews()
        setupListeners()
        loadData()
    }

    private fun bindViews() {
        tabGuilds     = findViewById(R.id.tabGuilds)
        tabUsers      = findViewById(R.id.tabUsers)
        recyclerView  = findViewById(R.id.recyclerView)
        progressBar   = findViewById(R.id.progressBar)
        tvEmpty       = findViewById(R.id.tvEmpty)
        tvTotalUsers  = findViewById(R.id.tvTotalUsers)
        tvTotalGuilds = findViewById(R.id.tvTotalGuilds)
        btnSwitchView = findViewById(R.id.btnSwitchView)
        btnCreateGuild = findViewById(R.id.btnCreateGuild)
        recyclerView.layoutManager = LinearLayoutManager(this)
    }

    private fun setupListeners() {
        btnSwitchView.setOnClickListener {
            startActivity(Intent(this, GuildsActivity::class.java))
        }

        btnCreateGuild.setOnClickListener {
            showCreateGuildDialog()
        }

        tabGuilds.setOnClickListener {
            activeTab = "guilds"
            updateTabHighlight()
            renderGuilds()
        }

        tabUsers.setOnClickListener {
            activeTab = "users"
            updateTabHighlight()
            renderUsers()
        }
    }

    private fun updateTabHighlight() {
        val activeColor   = getColor(R.color.primary_green)
        val inactiveColor = getColor(R.color.text_secondary)
        tabGuilds.setTextColor(if (activeTab == "guilds") activeColor else inactiveColor)
        tabUsers.setTextColor(if (activeTab == "users")  activeColor else inactiveColor)
    }

    private fun loadData() {
        val token = session.getToken() ?: return
        progressBar.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                // Load guilds
                val guildsRes = AdminRetrofitClient.adminApiService.getGuilds("Bearer $token")
                if (guildsRes.isSuccessful) {
                    guilds.clear()
                    guildsRes.body()?.data?.forEach { g ->
                        guilds.add(AdminGuild(g.id, g.name, g.description ?: "", g.memberCount, g.questCount))
                    }
                    tvTotalGuilds.text = guilds.size.toString()
                }

                // Load users via admin endpoint using raw retrofit call
                val usersRes = edu.cit.leanda.guildhall.admin.AdminRetrofitClient
                    .adminApiService.getUsers("Bearer $token")
                if (usersRes.isSuccessful) {
                    users.clear()
                    usersRes.body()?.data?.forEach { u ->
                        users.add(AdminUser(
                            id       = u.id,
                            username = u.username,
                            email    = u.email,
                            role     = u.role,
                            level    = u.level,
                            rank     = u.rank ?: "Bronze"
                        ))
                    }
                    tvTotalUsers.text = users.size.toString()
                }
            } catch (e: Exception) {
                Toast.makeText(this@AdminDashboardActivity, "Failed to load data: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                progressBar.visibility = View.GONE
                updateTabHighlight()
                renderGuilds()
            }
        }
    }

    private fun renderGuilds() {
        tvEmpty.visibility = if (guilds.isEmpty()) View.VISIBLE else View.GONE
        tvEmpty.text = "No guilds found."
        recyclerView.adapter = GuildAdapter(guilds) { guild ->
            confirmDeleteGuild(guild)
        }.apply {
            onOpen = { guild ->
                startActivity(Intent(this@AdminDashboardActivity, GuildDashboardActivity::class.java).apply {
                    putExtra("guildId", guild.id)
                    putExtra("guildName", guild.name)
                })
            }
        }
    }

    private fun renderUsers() {
        tvEmpty.visibility = if (users.isEmpty()) View.VISIBLE else View.GONE
        tvEmpty.text = "No users found."
        recyclerView.adapter = UserAdapter(users) { user ->
            confirmBanUser(user)
        }.apply {
            onOpen = { user ->
                startActivity(Intent(this@AdminDashboardActivity, AdminUserProfileActivity::class.java).apply {
                    putExtra("userId", user.id)
                })
            }
        }
    }

    private fun showCreateGuildDialog() {
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 8, 32, 0)
        }
        val nameInput = EditText(this).apply {
            hint = "Guild name"
            maxLines = 1
        }
        val descriptionInput = EditText(this).apply {
            hint = "Description"
            minLines = 3
            maxLines = 5
        }
        container.addView(nameInput)
        container.addView(descriptionInput)

        AlertDialog.Builder(this)
            .setTitle("Create Guild")
            .setView(container)
            .setPositiveButton("Create") { _, _ ->
                createGuild(nameInput.text.toString().trim(), descriptionInput.text.toString().trim())
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun createGuild(name: String, description: String) {
        if (name.isBlank()) {
            Toast.makeText(this, "Guild name is required.", Toast.LENGTH_SHORT).show()
            return
        }
        val token = session.getToken() ?: return
        lifecycleScope.launch {
            try {
                val response = AdminRetrofitClient.adminApiService.createGuild(
                    "Bearer $token",
                    CreateGuildRequest(name, description)
                )
                val created = response.body()?.data
                if (response.isSuccessful && created != null) {
                    guilds.add(AdminGuild(created.id, created.name, created.description ?: "", created.memberCount, created.questCount))
                    tvTotalGuilds.text = guilds.size.toString()
                    activeTab = "guilds"
                    updateTabHighlight()
                    renderGuilds()
                } else {
                    Toast.makeText(this@AdminDashboardActivity, response.body()?.error?.message ?: "Failed to create guild.", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@AdminDashboardActivity, e.message ?: "Failed to create guild.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun confirmDeleteGuild(guild: AdminGuild) {
        AlertDialog.Builder(this)
            .setTitle("Delete \"${guild.name}\"?")
            .setMessage("This cannot be undone.")
            .setPositiveButton("Delete") { _, _ -> deleteGuild(guild) }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun deleteGuild(guild: AdminGuild) {
        val token = session.getToken() ?: return
        lifecycleScope.launch {
            try {
                AdminRetrofitClient.adminApiService.deleteGuild("Bearer $token", guild.id)
                guilds.removeAll { it.id == guild.id }
                tvTotalGuilds.text = guilds.size.toString()
                renderGuilds()
            } catch (e: Exception) {
                Toast.makeText(this@AdminDashboardActivity, "Failed to delete guild.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun confirmBanUser(user: AdminUser) {
        AlertDialog.Builder(this)
            .setTitle("Ban \"${user.username}\"?")
            .setMessage("They will be removed from the platform.")
            .setPositiveButton("Ban") { _, _ -> banUser(user) }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun banUser(user: AdminUser) {
        val token = session.getToken() ?: return
        lifecycleScope.launch {
            try {
                AdminRetrofitClient.adminApiService.banUser("Bearer $token", user.id)
                users.removeAll { it.id == user.id }
                tvTotalUsers.text = users.size.toString()
                renderUsers()
            } catch (e: Exception) {
                Toast.makeText(this@AdminDashboardActivity, "Failed to ban user.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // ── Guild Adapter ──────────────────────────────────────────────────────────

    private class GuildAdapter(
        private val data: List<AdminGuild>,
        private val onDelete: (AdminGuild) -> Unit
    ) : RecyclerView.Adapter<GuildAdapter.Holder>() {
        var onOpen: ((AdminGuild) -> Unit)? = null

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_admin_guild, parent, false)
            return Holder(view)
        }

        override fun getItemCount() = data.size

        override fun onBindViewHolder(holder: Holder, position: Int) {
            holder.bind(data[position], onDelete, onOpen)
        }

        class Holder(view: View) : RecyclerView.ViewHolder(view) {
            fun bind(guild: AdminGuild, onDelete: (AdminGuild) -> Unit, onOpen: ((AdminGuild) -> Unit)?) {
                itemView.findViewById<TextView>(R.id.tvGuildName).text = guild.name
                itemView.findViewById<TextView>(R.id.tvMemberCount).text = "${guild.memberCount} members"
                itemView.findViewById<TextView>(R.id.tvQuestCount).text  = "${guild.questCount} quests"
                itemView.findViewById<TextView>(R.id.tvDescription).apply {
                    text = guild.description.ifBlank { "No description" }
                    visibility = View.VISIBLE
                }
                itemView.findViewById<MaterialButton>(R.id.btnDelete).setOnClickListener {
                    onDelete(guild)
                }
                itemView.setOnClickListener { onOpen?.invoke(guild) }
            }
        }
    }

    // ── User Adapter ───────────────────────────────────────────────────────────

    private class UserAdapter(
        private val data: List<AdminUser>,
        private val onBan: (AdminUser) -> Unit
    ) : RecyclerView.Adapter<UserAdapter.Holder>() {
        var onOpen: ((AdminUser) -> Unit)? = null

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_admin_user, parent, false)
            return Holder(view)
        }

        override fun getItemCount() = data.size

        override fun onBindViewHolder(holder: Holder, position: Int) {
            holder.bind(data[position], onBan, onOpen)
        }

        class Holder(view: View) : RecyclerView.ViewHolder(view) {
            fun bind(user: AdminUser, onBan: (AdminUser) -> Unit, onOpen: ((AdminUser) -> Unit)?) {
                itemView.findViewById<TextView>(R.id.tvUsername).text = user.username
                itemView.findViewById<TextView>(R.id.tvEmail).text    = user.email
                itemView.findViewById<TextView>(R.id.tvRank).text     = "Lv.${user.level} · ${user.rank}"
                itemView.findViewById<MaterialButton>(R.id.btnBan).setOnClickListener {
                    onBan(user)
                }
                itemView.setOnClickListener { onOpen?.invoke(user) }
            }
        }
    }
}
