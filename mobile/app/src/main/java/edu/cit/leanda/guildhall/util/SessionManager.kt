package edu.cit.leanda.guildhall.util

import android.content.Context
import android.content.SharedPreferences
import edu.cit.leanda.guildhall.auth.UserDto

/**
 * Thin wrapper around SharedPreferences.
 * Stores the JWT token and basic user info so the app can survive process death.
 *
 * Key names mirror the web app's localStorage where relevant.
 */
class SessionManager(context: Context) {

    companion object {
        private const val PREFS_NAME     = "guildhall_prefs"
        private const val KEY_TOKEN      = "guildhall_token"
        private const val KEY_USER_ID    = "user_id"
        private const val KEY_USERNAME   = "username"
        private const val KEY_EMAIL      = "email"
        private const val KEY_ROLE       = "role"
        private const val KEY_LEVEL      = "level"
        private const val KEY_XP         = "xp"
        private const val KEY_RANK       = "rank"
        private const val KEY_NEW_USER   = "new_user"
        private const val KEY_PROFILE_PIC = "profile_picture_url"
        private const val KEY_SKILLS     = "skills"   // comma-separated
    }

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // ── Token ────────────────────────────────────────────────────────────────

    fun saveToken(token: String) {
        prefs.edit().putString(KEY_TOKEN, token).apply()
    }

    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

    fun isLoggedIn(): Boolean = !getToken().isNullOrEmpty()

    // ── User info ─────────────────────────────────────────────────────────────

    fun saveUser(user: UserDto) {
        prefs.edit()
            .putLong(KEY_USER_ID, user.id)
            .putString(KEY_USERNAME, user.username)
            .putString(KEY_EMAIL, user.email)
            .putString(KEY_ROLE, user.role)
            .putInt(KEY_LEVEL, user.level)
            .putInt(KEY_XP, user.xp)
            .putString(KEY_RANK, user.rank ?: "Bronze")
            .putBoolean(KEY_NEW_USER, user.newUser)
            .putString(KEY_PROFILE_PIC, user.profilePictureUrl)
            .putString(KEY_SKILLS, user.skills?.joinToString(",") ?: "")
            .apply()
    }

    fun getUsername(): String?  = prefs.getString(KEY_USERNAME, null)
    fun getEmail(): String?     = prefs.getString(KEY_EMAIL, null)
    fun getRole(): String?      = prefs.getString(KEY_ROLE, null)
    fun isNewUser(): Boolean    = prefs.getBoolean(KEY_NEW_USER, false)
    fun isGuildmaster(): Boolean = getRole() == "ROLE_GUILDMASTER"
    fun getSkills(): List<String> {
        val raw = prefs.getString(KEY_SKILLS, "") ?: ""
        return if (raw.isBlank()) emptyList() else raw.split(",")
    }

    /** Mark the new-user flag as consumed so we don't re-show skills after the first login. */
    fun clearNewUser() {
        prefs.edit().putBoolean(KEY_NEW_USER, false).apply()
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    fun clearSession() {
        prefs.edit().clear().apply()
    }
}