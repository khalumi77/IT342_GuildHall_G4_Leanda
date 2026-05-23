package edu.cit.leanda.guildhall.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.guild.GuildsActivity
import edu.cit.leanda.guildhall.skills.SkillsActivity
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.launch

class RegisterActivity : AppCompatActivity() {

    // ── Views ─────────────────────────────────────────────────────────────────
    private lateinit var tilEmail: TextInputLayout
    private lateinit var etEmail: TextInputEditText
    private lateinit var tvEmailError: TextView

    private lateinit var tilUsername: TextInputLayout
    private lateinit var etUsername: TextInputEditText
    private lateinit var tvUsernameError: TextView

    private lateinit var tilPassword: TextInputLayout
    private lateinit var etPassword: TextInputEditText
    private lateinit var tvPasswordError: TextView

    private lateinit var btnSignUp: MaterialButton
    private lateinit var btnGoogleSignUp: MaterialButton
    private lateinit var progressBar: ProgressBar
    private lateinit var errorContainer: View
    private lateinit var tvServerError: TextView
    private lateinit var tvGoToLogin: TextView

    // ── Dependencies ──────────────────────────────────────────────────────────
    private lateinit var repository: AuthRepository
    private lateinit var sessionManager: SessionManager
    private lateinit var googleSignInClient: GoogleSignInClient

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register)

        repository     = AuthRepository(RetrofitClient.apiService)
        sessionManager = SessionManager(this)
        googleSignInClient = buildGoogleSignInClient()

        bindViews()
        setupListeners()
    }

    // ── View binding ──────────────────────────────────────────────────────────

    private fun bindViews() {
        tilEmail      = findViewById(R.id.tilEmail)
        etEmail       = findViewById(R.id.etEmail)
        tvEmailError  = findViewById(R.id.tvEmailError)

        tilUsername      = findViewById(R.id.tilUsername)
        etUsername       = findViewById(R.id.etUsername)
        tvUsernameError  = findViewById(R.id.tvUsernameError)

        tilPassword     = findViewById(R.id.tilPassword)
        etPassword      = findViewById(R.id.etPassword)
        tvPasswordError = findViewById(R.id.tvPasswordError)

        btnSignUp       = findViewById(R.id.btnSignUp)
        btnGoogleSignUp = findViewById(R.id.btnGoogleSignUp)
        progressBar     = findViewById(R.id.progressBar)
        errorContainer  = findViewById(R.id.errorContainer)
        tvServerError   = findViewById(R.id.tvServerError)
        tvGoToLogin     = findViewById(R.id.tvGoToLogin)
    }

    // ── Listeners ─────────────────────────────────────────────────────────────

    private fun setupListeners() {
        btnSignUp.setOnClickListener { attemptRegister() }

        etPassword.setOnEditorActionListener { _, _, _ ->
            attemptRegister()
            true
        }

        btnGoogleSignUp.setOnClickListener {
            hideServerError()
            launchGoogleAccountPicker()
        }

        tvGoToLogin.setOnClickListener {
            if (!navigateUpTo(Intent(this, LoginActivity::class.java))) {
                startActivity(Intent(this, LoginActivity::class.java))
            }
            finish()
        }

        etEmail.setOnFocusChangeListener    { _, _ -> clearFieldError(tvEmailError, tilEmail) }
        etUsername.setOnFocusChangeListener { _, _ -> clearFieldError(tvUsernameError, tilUsername) }
        etPassword.setOnFocusChangeListener { _, _ -> clearFieldError(tvPasswordError, tilPassword) }
    }

    // ── Validation ────────────────────────────────────────────────────────────

    private fun validate(): Boolean {
        var valid = true

        val email    = etEmail.text?.toString()?.trim() ?: ""
        val username = etUsername.text?.toString()?.trim() ?: ""
        val password = etPassword.text?.toString() ?: ""

        when {
            email.isEmpty() -> {
                showFieldError(tvEmailError, tilEmail, getString(R.string.error_field_required))
                valid = false
            }
            !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches() -> {
                showFieldError(tvEmailError, tilEmail, getString(R.string.error_invalid_email))
                valid = false
            }
        }

        when {
            username.isEmpty() -> {
                showFieldError(tvUsernameError, tilUsername, getString(R.string.error_field_required))
                valid = false
            }
            username.length < 3 -> {
                showFieldError(tvUsernameError, tilUsername, getString(R.string.error_username_short))
                valid = false
            }
        }

        when {
            password.isEmpty() -> {
                showFieldError(tvPasswordError, tilPassword, getString(R.string.error_field_required))
                valid = false
            }
            password.length < 8 -> {
                showFieldError(tvPasswordError, tilPassword, getString(R.string.error_password_short))
                valid = false
            }
        }

        return valid
    }

    // ── Register flow ─────────────────────────────────────────────────────────

    private fun attemptRegister() {
        hideServerError()
        if (!validate()) return

        val email    = etEmail.text?.toString()?.trim() ?: ""
        val username = etUsername.text?.toString()?.trim() ?: ""
        val password = etPassword.text?.toString() ?: ""

        setLoading(true)

        lifecycleScope.launch {
            val result = repository.register(email, username, password)
            setLoading(false)

            result.fold(
                onSuccess = { (token, user) ->
                    sessionManager.saveToken(token)
                    sessionManager.saveUser(user)
                    navigateAfterAuth(isNewUser = user.newUser)
                },
                onFailure = { error ->
                    showServerError(error.message ?: "Registration failed.")
                }
            )
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != RC_GOOGLE_SIGN_IN) return

        val task = GoogleSignIn.getSignedInAccountFromIntent(data)
        try {
            val account = task.getResult(Exception::class.java)
            val idToken = account.idToken
            if (idToken.isNullOrBlank()) {
                showServerError("Google did not return an ID token.")
                return
            }
            authenticateWithGoogle(idToken)
        } catch (e: Exception) {
            showServerError(e.message ?: "Google sign-in was cancelled.")
        }
    }

    private fun authenticateWithGoogle(idToken: String) {
        setLoading(true)
        lifecycleScope.launch {
            val result = repository.googleLogin(idToken)
            setLoading(false)

            result.fold(
                onSuccess = { (token, user) ->
                    sessionManager.saveToken(token)
                    sessionManager.saveUser(user)
                    navigateAfterAuth(isNewUser = user.newUser)
                },
                onFailure = { error ->
                    showServerError(error.message ?: "Google login failed.")
                }
            )
        }
    }

    private fun launchGoogleAccountPicker() {
        googleSignInClient.signOut().addOnCompleteListener {
            startActivityForResult(googleSignInClient.signInIntent, RC_GOOGLE_SIGN_IN)
        }
    }

    private fun buildGoogleSignInClient(): GoogleSignInClient {
        val options = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(getString(R.string.google_web_client_id))
            .requestEmail()
            .build()
        return GoogleSignIn.getClient(this, options)
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    private fun navigateAfterAuth(isNewUser: Boolean) {
        val destination = when {
            sessionManager.isGuildmaster() -> GuildsActivity::class.java
            isNewUser                      -> SkillsActivity::class.java
            else                           -> GuildsActivity::class.java
        }
        startActivity(Intent(this, destination))
        finish()
    }

    // ── UI helpers ────────────────────────────────────────────────────────────

    private fun setLoading(loading: Boolean) {
        progressBar.visibility    = if (loading) View.VISIBLE else View.GONE
        btnSignUp.isEnabled       = !loading
        btnGoogleSignUp.isEnabled = !loading
        btnSignUp.text = if (loading)
            getString(R.string.btn_enrolling)
        else
            getString(R.string.btn_sign_up)
    }

    private fun showServerError(message: String) {
        tvServerError.text        = message
        errorContainer.visibility = View.VISIBLE
    }

    private fun hideServerError() {
        errorContainer.visibility = View.GONE
    }

    private fun showFieldError(tv: TextView, til: TextInputLayout, message: String) {
        tv.text            = message
        tv.visibility      = View.VISIBLE
        til.isErrorEnabled = true
        til.error          = " "
    }

    private fun clearFieldError(tv: TextView, til: TextInputLayout) {
        tv.visibility      = View.GONE
        til.isErrorEnabled = false
        til.error          = null
    }

    companion object {
        private const val RC_GOOGLE_SIGN_IN = 9001
    }
}
