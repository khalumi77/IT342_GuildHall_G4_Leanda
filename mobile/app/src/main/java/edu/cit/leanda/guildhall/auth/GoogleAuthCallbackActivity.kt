package edu.cit.leanda.guildhall.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.guild.GuildsActivity
import edu.cit.leanda.guildhall.skills.SkillsActivity
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.launch

/**
 * GoogleAuthCallbackActivity
 *
 * Catches the deep link: guildhall://auth/google/success?token=<JWT>&newUser=true|false
 *
 * The backend-driven Google OAuth flow is:
 *   1. User taps "Continue with Google" in LoginActivity or RegisterActivity
 *   2. Chrome Custom Tab opens: {server}/api/v1/auth/google/init
 *   3. Backend redirects browser → Google consent page
 *   4. Google redirects back → {server}/api/v1/auth/google/callback
 *   5. Backend exchanges code, finds/creates user, issues JWT
 *   6. Backend redirects to:
 *      guildhall://auth/google/success?token=<JWT>&newUser=true|false
 *   7. Android OS delivers that URI to this activity via the intent filter
 *   8. We extract the token, call /auth/me to get full profile, navigate
 */
class GoogleAuthCallbackActivity : AppCompatActivity() {

    private lateinit var repository: AuthRepository
    private lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_google_callback)

        repository     = AuthRepository(RetrofitClient.apiService)
        sessionManager = SessionManager(this)

        handleDeepLink()
    }

    /**
     * Also called when the activity is already running (singleTask) and a new
     * intent arrives — e.g. if the user taps "Continue with Google" again.
     */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink()
    }

    private fun handleDeepLink() {
        val uri = intent?.data

        // Paranoia check — should always have data due to the intent filter
        if (uri == null) {
            showError("No authentication data received.")
            return
        }

        // Check for an error flag from the backend
        val error = uri.getQueryParameter("error")
        if (!error.isNullOrBlank()) {
            showError(error)
            return
        }

        val token   = uri.getQueryParameter("token")
        val newUser = uri.getQueryParameter("newUser") == "true"

        if (token.isNullOrBlank()) {
            showError("No token received from server.")
            return
        }

        // Persist the JWT immediately so /auth/me succeeds
        sessionManager.saveToken(token)

        // Fetch full profile from /auth/me to populate SessionManager
        setLoading(true)
        lifecycleScope.launch {
            val result = repository.me(token)
            setLoading(false)

            result.fold(
                onSuccess = { (_, user) ->
                    sessionManager.saveUser(user)
                    navigateAfterAuth(user.newUser || newUser)
                },
                onFailure = { err ->
                    // Token was valid enough for the deep link but /me failed —
                    // clear the bad token and show an error
                    sessionManager.clearSession()
                    showError(err.message ?: "Failed to load your profile.")
                }
            )
        }
    }

    private fun navigateAfterAuth(isNewUser: Boolean) {
        val destination = when {
            sessionManager.isGuildmaster() -> GuildsActivity::class.java
            isNewUser                      -> SkillsActivity::class.java
            else                           -> GuildsActivity::class.java
        }
        startActivity(Intent(this, destination).apply {
            // Clear the back stack so the user can't go back to the callback screen
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        })
        finish()
    }

    private fun setLoading(loading: Boolean) {
        findViewById<View>(R.id.loadingGroup)?.visibility =
            if (loading) View.VISIBLE else View.GONE
        findViewById<View>(R.id.errorGroup)?.visibility  = View.GONE
    }

    private fun showError(message: String) {
        findViewById<View>(R.id.loadingGroup)?.visibility = View.GONE
        findViewById<View>(R.id.errorGroup)?.visibility  = View.VISIBLE
        findViewById<TextView>(R.id.tvErrorMessage)?.text = message
        findViewById<View>(R.id.btnBackToLogin)?.setOnClickListener {
            startActivity(Intent(this, LoginActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            })
            finish()
        }
    }
}