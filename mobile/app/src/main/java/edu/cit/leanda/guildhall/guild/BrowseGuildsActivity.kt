package edu.cit.leanda.guildhall.guild

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.auth.RetrofitClient
import edu.cit.leanda.guildhall.util.GuildHallNavbar
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.launch

/**
 * BrowseGuildsActivity — shows ALL guilds with a "Join" button on each.
 * Mirrors the web BrowseGuilds component.
 */
class BrowseGuildsActivity : AppCompatActivity() {

    private lateinit var sessionManager: SessionManager

    private lateinit var btnBack: TextView
    private lateinit var etSearch: EditText
    private lateinit var recyclerView: RecyclerView
    private lateinit var progressBar: ProgressBar
    private lateinit var tvEmpty: TextView
    private lateinit var errorContainer: View
    private lateinit var tvError: TextView
    private lateinit var btnRetry: MaterialButton

    private lateinit var adapter: BrowseGuildAdapter
    private val allGuilds = mutableListOf<BrowseGuildItem>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_browse_guilds)

        sessionManager = SessionManager(this)

        bindViews()
        setupRecyclerView()
        setupListeners()
        loadGuilds()
    }

    private fun bindViews() {
        btnBack        = findViewById(R.id.btnBack)
        etSearch       = findViewById(R.id.etSearch)
        recyclerView   = findViewById(R.id.recyclerView)
        progressBar    = findViewById(R.id.progressBar)
        tvEmpty        = findViewById(R.id.tvEmpty)
        errorContainer = findViewById(R.id.errorContainer)
        tvError        = findViewById(R.id.tvError)
        btnRetry       = findViewById(R.id.btnRetry)
        GuildHallNavbar.setup(this, findViewById(R.id.btnChat), findViewById(R.id.btnProfile))
    }

    private fun setupRecyclerView() {
        adapter = BrowseGuildAdapter(emptyList()) { guild ->
            showJoinConfirmDialog(guild)
        }
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter
    }

    private fun setupListeners() {
        btnBack.setOnClickListener { finish() }

        btnRetry.setOnClickListener { loadGuilds() }

        etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                filterGuilds(s?.toString() ?: "")
            }
        })
    }

    private fun loadGuilds() {
        val token = sessionManager.getToken() ?: return
        hideError()
        setLoading(true)

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.allGuilds("Bearer $token")
                setLoading(false)

                if (response.isSuccessful && response.body()?.success == true) {
                    val guilds = response.body()?.data ?: emptyList()
                    allGuilds.clear()
                    allGuilds.addAll(guilds.map {
                        BrowseGuildItem(
                            id          = it.id,
                            name        = it.name,
                            description = it.description ?: "",
                            memberCount = it.memberCount,
                            questCount  = it.questCount,
                            isMember    = it.isMember ?: false
                        )
                    })
                    filterGuilds(etSearch.text?.toString() ?: "")
                } else {
                    showError("Failed to load guilds.")
                }
            } catch (e: Exception) {
                setLoading(false)
                showError(e.message ?: "An unexpected error occurred.")
            }
        }
    }

    private fun showJoinConfirmDialog(guild: BrowseGuildItem) {
        val dialog = JoinGuildDialog(this, guild) {
            joinGuild(guild)
        }
        dialog.show()
    }

    private fun joinGuild(guild: BrowseGuildItem) {
        val token = sessionManager.getToken() ?: return

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.joinGuild("Bearer $token", guild.id)
                if (response.isSuccessful && response.body()?.success == true) {
                    // Update the local list so the button flips to "Joined ✓"
                    val idx = allGuilds.indexOfFirst { it.id == guild.id }
                    if (idx != -1) {
                        allGuilds[idx] = allGuilds[idx].copy(
                            isMember    = true,
                            memberCount = allGuilds[idx].memberCount + 1
                        )
                        filterGuilds(etSearch.text?.toString() ?: "")
                    }
                } else {
                    val msg = response.body()?.error?.message ?: "Failed to join guild."
                    showError(msg)
                }
            } catch (e: Exception) {
                showError(e.message ?: "An unexpected error occurred.")
            }
        }
    }

    private fun filterGuilds(query: String) {
        val filtered = if (query.isBlank()) allGuilds.toList()
        else allGuilds.filter {
            it.name.contains(query, ignoreCase = true) ||
                    it.description.contains(query, ignoreCase = true)
        }
        adapter.updateData(filtered)

        tvEmpty.visibility      = if (filtered.isEmpty()) View.VISIBLE else View.GONE
        recyclerView.visibility = if (filtered.isEmpty()) View.GONE   else View.VISIBLE
        tvEmpty.text = if (allGuilds.isEmpty()) "No guilds available yet."
        else "No guilds match your search."
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility  = if (loading) View.VISIBLE else View.GONE
        if (loading) {
            recyclerView.visibility = View.GONE
            tvEmpty.visibility      = View.GONE
        }
    }

    private fun showError(message: String) {
        tvError.text              = message
        errorContainer.visibility = View.VISIBLE
        recyclerView.visibility   = View.GONE
        tvEmpty.visibility        = View.GONE
    }

    private fun hideError() {
        errorContainer.visibility = View.GONE
    }
}
