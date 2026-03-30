package edu.cit.leanda.guildhall

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import edu.cit.leanda.guildhall.network.RetrofitClient
import edu.cit.leanda.guildhall.repository.AuthRepository
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    // ── Views ─────────────────────────────────────────────────────────────────
    private lateinit var tilUsernameOrEmail: TextInputLayout
    private lateinit var etUsernameOrEmail: TextInputEditText
    private lateinit var tvUsernameError: TextView

    private lateinit var tilPassword: TextInputLayout
    private lateinit var etPassword: TextInputEditText
    private lateinit var tvPasswordError: TextView

    private lateinit var btnSignIn: MaterialButton
    private lateinit var btnGoogleSignIn: MaterialButton
    private lateinit var progressBar: ProgressBar
    private lateinit var errorContainer: View
    private lateinit var tvServerError: TextView
    private lateinit var tvGoToRegister: TextView

    // ── Dependencies ──────────────────────────────────────────────────────────
    private lateinit var repository: AuthRepository
    private lateinit var sessionManager: SessionManager
    private lateinit var googleSignInClient: GoogleSignInClient

    companion object {
        private const val RC_GOOGLE_SIGN_IN = 9001

        // ⚠️  Replace with your actual Google Web Client ID from Firebase / Google Cloud Console
        // This is the SAME client ID used by the web app (VITE_GOOGLE_CLIENT_ID)
        private const val GOOGLE_WEB_CLIENT_ID =
            "835483502200-dc4gpdia39m4iseh8opekoc78pkddbm7.apps.googleusercontent.com"
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        repository     = AuthRepository(RetrofitClient.apiService)
        sessionManager = SessionManager(this)

        // If already logged in, skip straight to the main screen
        if (sessionManager.isLoggedIn()) {
            navigateAfterAuth(sessionManager.isNewUser())
            return
        }

        bindViews()
        setupGoogleSignIn()
        setupListeners()
    }

    // ── View binding ──────────────────────────────────────────────────────────

    private fun bindViews() {
        tilUsernameOrEmail = findViewById(R.id.tilUsernameOrEmail)
        etUsernameOrEmail  = findViewById(R.id.etUsernameOrEmail)
        tvUsernameError    = findViewById(R.id.tvUsernameError)

        tilPassword    = findViewById(R.id.tilPassword)
        etPassword     = findViewById(R.id.etPassword)
        tvPasswordError = findViewById(R.id.tvPasswordError)

        btnSignIn       = findViewById(R.id.btnSignIn)
        btnGoogleSignIn = findViewById(R.id.btnGoogleSignIn)
        progressBar     = findViewById(R.id.progressBar)
        errorContainer  = findViewById(R.id.errorContainer)
        tvServerError   = findViewById(R.id.tvServerError)
        tvGoToRegister  = findViewById(R.id.tvGoToRegister)
    }

    // ── Google Sign-In setup ──────────────────────────────────────────────────

    private fun setupGoogleSignIn() {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(GOOGLE_WEB_CLIENT_ID)
            .requestEmail()
            .build()
        googleSignInClient = GoogleSignIn.getClient(this, gso)
    }

    // ── Listeners ─────────────────────────────────────────────────────────────

    private fun setupListeners() {
        btnSignIn.setOnClickListener { attemptLogin() }

        // Allow submitting by pressing Done on the keyboard
        etPassword.setOnEditorActionListener { _, _, _ ->
            attemptLogin()
            true
        }

        btnGoogleSignIn.setOnClickListener {
            val signInIntent = googleSignInClient.signInIntent
            startActivityForResult(signInIntent, RC_GOOGLE_SIGN_IN)
        }

        tvGoToRegister.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
            // Don't finish — user may come back
        }

        // Clear field-level errors as user types
        etUsernameOrEmail.setOnFocusChangeListener { _, _ -> clearFieldError(tvUsernameError, tilUsernameOrEmail) }
        etPassword.setOnFocusChangeListener { _, _ -> clearFieldError(tvPasswordError, tilPassword) }
    }

    // ── Validation ────────────────────────────────────────────────────────────

    private fun validate(): Boolean {
        var valid = true

        val usernameOrEmail = etUsernameOrEmail.text?.toString()?.trim() ?: ""
        val password        = etPassword.text?.toString() ?: ""

        if (usernameOrEmail.isEmpty()) {
            showFieldError(tvUsernameError, tilUsernameOrEmail, getString(R.string.error_field_required))
            valid = false
        }

        if (password.isEmpty()) {
            showFieldError(tvPasswordError, tilPassword, getString(R.string.error_field_required))
            valid = false
        }

        return valid
    }

    // ── Login flow ────────────────────────────────────────────────────────────

    private fun attemptLogin() {
        hideServerError()
        if (!validate()) return

        val usernameOrEmail = etUsernameOrEmail.text?.toString()?.trim() ?: ""
        val password        = etPassword.text?.toString() ?: ""

        setLoading(true)

        lifecycleScope.launch {
            val result = repository.login(usernameOrEmail, password)
            setLoading(false)

            result.fold(
                onSuccess = { (token, user) ->
                    sessionManager.saveToken(token)
                    sessionManager.saveUser(user)
                    navigateAfterAuth(isNewUser = false) // login → never new user
                },
                onFailure = { error ->
                    showServerError(error.message ?: "Login failed.")
                }
            )
        }
    }

    // ── Google Sign-In result ─────────────────────────────────────────────────

    @Deprecated("onActivityResult deprecated in favour of ActivityResultLauncher, kept for Iguana compat")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == RC_GOOGLE_SIGN_IN) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            try {
                val account: GoogleSignInAccount = task.getResult(ApiException::class.java)
                val idToken = account.idToken
                if (idToken != null) {
                    handleGoogleIdToken(idToken)
                } else {
                    showServerError("Google Sign-In failed: no ID token received.")
                }
            } catch (e: ApiException) {
                showServerError("Google Sign-In cancelled or failed.")
            }
        }
    }

    private fun handleGoogleIdToken(idToken: String) {
        setLoading(true)
        lifecycleScope.launch {
            val result = repository.googleLogin(idToken)
            setLoading(false)

            result.fold(
                onSuccess = { (token, user) ->
                    sessionManager.saveToken(token)
                    sessionManager.saveUser(user)
                    navigateAfterAuth(user.newUser)
                },
                onFailure = { error ->
                    showServerError(error.message ?: "Google Sign-In failed.")
                }
            )
        }
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    private fun navigateAfterAuth(isNewUser: Boolean) {
        val destination = when {
            sessionManager.isGuildmaster() -> MainActivity::class.java  // → admin home
            isNewUser                      -> SkillsActivity::class.java // → skill picker
            else                           -> MainActivity::class.java   // → guild list
        }
        startActivity(Intent(this, destination))
        finish()
    }

    // ── UI helpers ────────────────────────────────────────────────────────────

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        btnSignIn.isEnabled       = !loading
        btnGoogleSignIn.isEnabled = !loading
        btnSignIn.text = if (loading)
            getString(R.string.btn_signing_in)
        else
            getString(R.string.btn_sign_in)
    }

    private fun showServerError(message: String) {
        tvServerError.text  = message
        errorContainer.visibility = View.VISIBLE
    }

    private fun hideServerError() {
        errorContainer.visibility = View.GONE
    }

    private fun showFieldError(tv: TextView, til: TextInputLayout, message: String) {
        tv.text       = message
        tv.visibility = View.VISIBLE
        til.isErrorEnabled = true
        til.error     = " "          // triggers red stroke without duplicate text
    }

    private fun clearFieldError(tv: TextView, til: TextInputLayout) {
        tv.visibility      = View.GONE
        til.isErrorEnabled = false
        til.error          = null
    }
}