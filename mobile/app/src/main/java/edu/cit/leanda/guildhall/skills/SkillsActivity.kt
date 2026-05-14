package edu.cit.leanda.guildhall.skills

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.auth.AuthRepository
import edu.cit.leanda.guildhall.auth.RetrofitClient
import edu.cit.leanda.guildhall.guild.GuildsActivity
import edu.cit.leanda.guildhall.util.SessionManager
import kotlinx.coroutines.launch

/**
 * SkillsActivity — first-time onboarding screen.
 *
 * Mirrors the web SkillsSelection component:
 *   - 8 skill chips in a 3-column grid (toggleable)
 *   - "Skip for now" → goes straight to guilds without saving
 *   - "Continue"     → POST /auth/skills then navigates to guilds
 */
class SkillsActivity : AppCompatActivity() {

    companion object {
        // Must match the backend's VALID_SKILLS list in AuthService
        val ALL_SKILLS = listOf(
            "Design", "Academic", "Caregiving", "Manual Labor",
            "IT/Tech", "Media", "Writing", "Tutoring"
        )
        val SKILL_EMOJI = mapOf(
            "Design"       to "🎨",
            "Academic"     to "📚",
            "Caregiving"   to "🤝",
            "Manual Labor" to "💪",
            "IT/Tech"      to "💻",
            "Media"        to "🎤",
            "Writing"      to "✍️",
            "Tutoring"     to "🎓"
        )
    }

    private val selectedSkills = mutableSetOf<String>()

    private lateinit var repository: AuthRepository
    private lateinit var sessionManager: SessionManager

    // Skill chip button references mapped by skill name
    private val skillButtons = mutableMapOf<String, MaterialButton>()

    private lateinit var btnContinue: MaterialButton
    private lateinit var btnSkip: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var errorContainer: View
    private lateinit var tvError: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_skills)

        repository     = AuthRepository(RetrofitClient.apiService)
        sessionManager = SessionManager(this)

        bindViews()
        setupSkillChips()
        setupListeners()
    }

    private fun bindViews() {
        btnContinue    = findViewById(R.id.btnContinue)
        btnSkip        = findViewById(R.id.btnSkip)
        progressBar    = findViewById(R.id.progressBar)
        errorContainer = findViewById(R.id.errorContainer)
        tvError        = findViewById(R.id.tvError)

        // Map each skill button by its tag (set in XML)
        ALL_SKILLS.forEach { skill ->
            val resName = "skillBtn${skill.replace("/", "").replace(" ", "")}"
            val resId   = resources.getIdentifier(resName, "id", packageName)
            if (resId != 0) {
                skillButtons[skill] = findViewById(resId)
            }
        }
    }

    private fun setupSkillChips() {
        skillButtons.forEach { (skill, btn) ->
            btn.setOnClickListener {
                if (selectedSkills.contains(skill)) {
                    selectedSkills.remove(skill)
                    setChipSelected(btn, false)
                } else {
                    selectedSkills.add(skill)
                    setChipSelected(btn, true)
                }
            }
            setChipSelected(btn, false) // initial state
        }
    }

    private fun setChipSelected(btn: MaterialButton, selected: Boolean) {
        if (selected) {
            btn.setBackgroundColor(getColor(R.color.skill_chip_selected_bg))
            btn.strokeColor = android.content.res.ColorStateList.valueOf(
                getColor(R.color.primary_green)
            )
            btn.strokeWidth = resources.getDimensionPixelSize(R.dimen.stroke_selected)
        } else {
            btn.setBackgroundColor(getColor(R.color.surface_white))
            btn.strokeColor = android.content.res.ColorStateList.valueOf(
                getColor(R.color.border_default)
            )
            btn.strokeWidth = resources.getDimensionPixelSize(R.dimen.stroke_default)
        }
    }

    private fun setupListeners() {
        btnSkip.setOnClickListener {
            // Mark new-user flag as consumed so we don't show this screen again
            sessionManager.clearNewUser()
            navigateToGuilds()
        }

        btnContinue.setOnClickListener {
            saveSkillsAndContinue()
        }
    }

    private fun saveSkillsAndContinue() {
        val token = sessionManager.getToken()
        if (token.isNullOrBlank()) {
            navigateToGuilds()
            return
        }

        hideError()
        setLoading(true)

        lifecycleScope.launch {
            val result = repository.saveSkills(token, selectedSkills.toList())
            setLoading(false)

            result.fold(
                onSuccess = { (newToken, user) ->
                    sessionManager.saveToken(newToken)
                    sessionManager.saveUser(user)
                    sessionManager.clearNewUser()
                    navigateToGuilds()
                },
                onFailure = { err ->
                    showError(err.message ?: "Failed to save skills. Please try again.")
                }
            )
        }
    }

    private fun navigateToGuilds() {
        startActivity(Intent(this, GuildsActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        })
        finish()
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility    = if (loading) View.VISIBLE else View.GONE
        btnContinue.isEnabled     = !loading
        btnSkip.isEnabled         = !loading
        btnContinue.text = if (loading)
            getString(R.string.btn_saving)
        else
            getString(R.string.btn_continue)
    }

    private fun showError(message: String) {
        tvError.text           = message
        errorContainer.visibility = View.VISIBLE
    }

    private fun hideError() {
        errorContainer.visibility = View.GONE
    }
}