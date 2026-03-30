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

    companion object {
        private const val RC_GOOGLE_SIGN_UP = 9002
        private const val GOOGLE_WEB_CLIENT_ID =
            "835483502200-dc4gpdia39m4iseh8opekoc78pkddbm7.apps.googleusercontent.com"
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register)

        repository     = AuthRepository(RetrofitClient.apiService)
        sessionManager = SessionManager(this)

        bindViews()
        setupGoogleSignIn()
        setupListeners()
    }

    // ── View binding ──────────────────────────────────────────────────────────

    private fun bindViews() {
        tilEmail    = findViewById(R.id.tilEmail)
        etEmail     = findViewById(R.id.etEmail)
        tvEmailError = findViewById(R.id.tvEmailError)

        tilUsername    = findViewById(R.id.tilUsername)
        etUsername     = findViewById(R.id.etUsername)
        tvUsernameError = findViewById(R.id.tvUsernameError)

        tilPassword    = findViewById(R.id.tilPassword)
        etPassword     = findViewById(R.id.etPassword)
        tvPasswordError = findViewById(R.id.tvPasswordError)

        btnSignUp       = findViewById(R.id.btnSignUp)
        btnGoogleSignUp = findViewById(R.id.btnGoogleSignUp)
        progressBar     = findViewById(R.id.progressBar)
        errorContainer  = findViewById(R.id.errorContainer)
        tvServerError   = findViewById(R.id.tvServerError)
        tvGoToLogin     = findViewById(R.id.tvGoToLogin)
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
        btnSignUp.setOnClickListener { attemptRegister() }

        etPassword.setOnEditorActionListener { _, _, _ ->
            attemptRegister()
            true
        }

        btnGoogleSignUp.setOnClickListener {
            startActivityForResult(googleSignInClient.signInIntent, RC_GOOGLE_SIGN_UP)
        }

        tvGoToLogin.setOnClickListener {
            // Go back if LoginActivity is already in the back stack, else start it
            if (!navigateUpTo(Intent(this, LoginActivity::class.java))) {
                startActivity(Intent(this, LoginActivity::class.java))
            }
            finish()
        }

        // Clear field-level errors as user types
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

        // Email
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

        // Username
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

        // Password
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

    // ── Google Sign-In result ─────────────────────────────────────────────────

    @Deprecated("Kept for Android Studio Iguana / API compat")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == RC_GOOGLE_SIGN_UP) {
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
            sessionManager.isGuildmaster() -> MainActivity::class.java
            isNewUser                      -> SkillsActivity::class.java
            else                           -> MainActivity::class.java
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
}