package edu.cit.leanda.guildhall.guild

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.auth.LoginActivity
import edu.cit.leanda.guildhall.auth.RetrofitClient
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.launch

/**
 * GuildsActivity — "My Guilds" screen.
 *
 * Mirrors the web GuildsPage component:
 *  - Navbar with logo + profile dropdown (simplified to logout button)
 *  - Search field to filter guilds by name
 *  - RecyclerView of guild cards showing name, member count, quest count
 *  - Empty state when no guilds or no search results
 *  - "Browse more guilds" button (placeholder for now)
 */
class GuildsActivity : AppCompatActivity() {

    private lateinit var sessionManager: SessionManager

    private lateinit var tvUsername: TextView
    private lateinit var btnLogout: TextView
    private lateinit var etSearch: android.widget.EditText
    private lateinit var recyclerView: RecyclerView
    private lateinit var progressBar: ProgressBar
    private lateinit var tvEmpty: TextView
    private lateinit var errorContainer: View
    private lateinit var tvError: TextView
    private lateinit var btnRetry: MaterialButton

    private lateinit var adapter: GuildAdapter
    private val allGuilds = mutableListOf<GuildItem>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_guilds)

        sessionManager = SessionManager(this)

        // If somehow not logged in, go back to login
        if (!sessionManager.isLoggedIn()) {
            startActivity(Intent(this, LoginActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            })
            finish()
            return
        }

        bindViews()
        setupRecyclerView()
        setupListeners()
        loadGuilds()
    }

    private fun bindViews() {
        tvUsername     = findViewById(R.id.tvUsername)
        btnLogout      = findViewById(R.id.btnLogout)
        etSearch       = findViewById(R.id.etSearch)
        recyclerView   = findViewById(R.id.recyclerView)
        progressBar    = findViewById(R.id.progressBar)
        tvEmpty        = findViewById(R.id.tvEmpty)
        errorContainer = findViewById(R.id.errorContainer)
        tvError        = findViewById(R.id.tvError)
        btnRetry       = findViewById(R.id.btnRetry)

        tvUsername.text = sessionManager.getUsername() ?: "adventurer"
    }

    private fun setupRecyclerView() {
        adapter = GuildAdapter(emptyList())
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter
    }

    private fun setupListeners() {
        btnLogout.setOnClickListener {
            sessionManager.clearSession()
            startActivity(Intent(this, LoginActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            })
            finish()
        }

        btnRetry.setOnClickListener {
            loadGuilds()
        }

        // Live search filter
        etSearch.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: android.text.Editable?) {
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
                val response = RetrofitClient.apiService.myGuilds("Bearer $token")
                setLoading(false)

                if (response.isSuccessful && response.body()?.success == true) {
                    val guilds = response.body()?.data ?: emptyList()
                    allGuilds.clear()
                    allGuilds.addAll(guilds.map {
                        GuildItem(
                            id          = it.id,
                            name        = it.name,
                            description = it.description ?: "",
                            memberCount = it.memberCount,
                            questCount  = it.questCount
                        )
                    })
                    filterGuilds(etSearch.text?.toString() ?: "")
                } else {
                    showError("Failed to load guilds. Please try again.")
                }
            } catch (e: Exception) {
                setLoading(false)
                showError(
                    when {
                        e.message?.contains("Unable to resolve host") == true ->
                            "Cannot reach server. Check your internet connection."
                        else -> e.message ?: "An unexpected error occurred."
                    }
                )
            }
        }
    }

    private fun filterGuilds(query: String) {
        val filtered = if (query.isBlank()) {
            allGuilds.toList()
        } else {
            allGuilds.filter {
                it.name.contains(query, ignoreCase = true) ||
                        it.description.contains(query, ignoreCase = true)
            }
        }
        adapter.updateData(filtered)

        tvEmpty.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
        tvEmpty.text = when {
            allGuilds.isEmpty() -> getString(R.string.guilds_empty_none)
            else                -> getString(R.string.guilds_empty_search)
        }
        recyclerView.visibility = if (filtered.isEmpty()) View.GONE else View.VISIBLE
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility  = if (loading) View.VISIBLE else View.GONE
        recyclerView.visibility = if (loading) View.GONE else recyclerView.visibility
        tvEmpty.visibility      = if (loading) View.GONE else tvEmpty.visibility
    }

    private fun showError(message: String) {
        tvError.text           = message
        errorContainer.visibility = View.VISIBLE
        recyclerView.visibility   = View.GONE
        tvEmpty.visibility        = View.GONE
    }

    private fun hideError() {
        errorContainer.visibility = View.GONE
    }
}