package edu.cit.leanda.guildhall.util

import android.content.Context
import android.content.SharedPreferences
import edu.cit.leanda.guildhall.network.UserDto

/**
 * Thin wrapper around SharedPreferences.
 * Stores the JWT token and basic user info so the app can survive process death.
 *
 * Mirrors the web app's localStorage key "guildhall_token".
 */
class SessionManager(context: Context) {

    companion object {
        private const val PREFS_NAME      = "guildhall_prefs"
        private const val KEY_TOKEN        = "guildhall_token"
        private const val KEY_USER_ID      = "user_id"
        private const val KEY_USERNAME     = "username"
        private const val KEY_EMAIL        = "email"
        private const val KEY_ROLE         = "role"
        private const val KEY_LEVEL        = "level"
        private const val KEY_XP           = "xp"
        private const val KEY_RANK         = "rank"
        private const val KEY_NEW_USER     = "new_user"
        private const val KEY_PROFILE_PIC  = "profile_picture_url"
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
            .apply()
    }

    fun getUsername(): String? = prefs.getString(KEY_USERNAME, null)
    fun getEmail(): String?    = prefs.getString(KEY_EMAIL, null)
    fun getRole(): String?     = prefs.getString(KEY_ROLE, null)
    fun isNewUser(): Boolean   = prefs.getBoolean(KEY_NEW_USER, false)
    fun isGuildmaster(): Boolean = getRole() == "ROLE_GUILDMASTER"

    // ── Logout ────────────────────────────────────────────────────────────────

    fun clearSession() {
        prefs.edit().clear().apply()
    }
}