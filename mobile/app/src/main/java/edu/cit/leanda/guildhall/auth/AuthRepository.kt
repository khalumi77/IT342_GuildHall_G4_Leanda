package edu.cit.leanda.guildhall.auth

/**
 * AuthRepository wraps all authentication network calls.
 * Returns a [Result] so the ViewModel / Activity can handle success/failure cleanly.
 *
 * Google OAuth is now backend-driven — the repository only needs to call /auth/me
 * after the backend redirects back with a JWT in the deep link.
 */
class AuthRepository(private val api: ApiService) {

    /**
     * Register a new user.
     * @return Result containing the UserDto and JWT token on success.
     */
    suspend fun register(
        email: String,
        username: String,
        password: String
    ): Result<Pair<String, UserDto>> {
        return try {
            val response = api.register(RegisterRequest(email, username, password))
            val envelope = response.body()

            when {
                response.isSuccessful && envelope?.success == true -> {
                    val token = envelope.data?.token
                    val user  = envelope.data?.user
                    if (token != null && user != null) {
                        Result.success(Pair(token, user))
                    } else {
                        Result.failure(Exception("Invalid response from server"))
                    }
                }
                else -> {
                    val message = envelope?.error?.message
                        ?: response.errorBody()?.string()
                        ?: "Registration failed. Please try again."
                    Result.failure(Exception(message))
                }
            }
        } catch (e: Exception) {
            Result.failure(Exception(networkErrorMessage(e)))
        }
    }

    /**
     * Log in an existing user.
     * @param usernameOrEmail The value in the username/email field.
     */
    suspend fun login(
        usernameOrEmail: String,
        password: String
    ): Result<Pair<String, UserDto>> {
        return try {
            val response = api.login(LoginRequest(usernameOrEmail, password))
            val envelope = response.body()

            when {
                response.isSuccessful && envelope?.success == true -> {
                    val token = envelope.data?.token
                    val user  = envelope.data?.user
                    if (token != null && user != null) {
                        Result.success(Pair(token, user))
                    } else {
                        Result.failure(Exception("Invalid response from server"))
                    }
                }
                response.code() == 401 -> {
                    Result.failure(Exception("Invalid credentials. Please try again."))
                }
                else -> {
                    val message = envelope?.error?.message
                        ?: "Login failed. Please try again."
                    Result.failure(Exception(message))
                }
            }
        } catch (e: Exception) {
            Result.failure(Exception(networkErrorMessage(e)))
        }
    }

    suspend fun googleLogin(idToken: String): Result<Pair<String, UserDto>> {
        return try {
            val response = api.googleLogin(GoogleLoginRequest(idToken))
            val envelope = response.body()

            when {
                response.isSuccessful && envelope?.success == true -> {
                    val token = envelope.data?.token
                    val user = envelope.data?.user
                    if (token != null && user != null) {
                        Result.success(Pair(token, user))
                    } else {
                        Result.failure(Exception("Invalid response from server"))
                    }
                }
                else -> {
                    val message = envelope?.error?.message
                        ?: response.errorBody()?.string()
                        ?: "Google login failed. Please try again."
                    Result.failure(Exception(message))
                }
            }
        } catch (e: Exception) {
            Result.failure(Exception(networkErrorMessage(e)))
        }
    }

    /**
     * Save the user's selected skills (called from the skills onboarding screen).
     * @param token  The JWT from login/register.
     * @param skills List of skill name strings.
     */
    suspend fun saveSkills(
        token: String,
        skills: List<String>
    ): Result<Pair<String, UserDto>> {
        return try {
            val response = api.saveSkills("Bearer $token", SkillsRequest(skills))
            val envelope = response.body()

            when {
                response.isSuccessful && envelope?.success == true -> {
                    val newToken = envelope.data?.token ?: token
                    val user     = envelope.data?.user
                    if (user != null) {
                        Result.success(Pair(newToken, user))
                    } else {
                        Result.failure(Exception("Invalid response from server"))
                    }
                }
                else -> {
                    val message = envelope?.error?.message ?: "Failed to save skills."
                    Result.failure(Exception(message))
                }
            }
        } catch (e: Exception) {
            Result.failure(Exception(networkErrorMessage(e)))
        }
    }

    /**
     * Fetch the current user's profile using a JWT.
     * Used by [GoogleAuthCallbackActivity] after receiving the token from the deep link.
     */
    suspend fun me(token: String): Result<Pair<String, UserDto>> {
        return try {
            val response = api.me("Bearer $token")
            val envelope = response.body()

            when {
                response.isSuccessful && envelope?.success == true -> {
                    val user = envelope.data?.user
                    if (user != null) {
                        Result.success(Pair(token, user))
                    } else {
                        Result.failure(Exception("Failed to load profile."))
                    }
                }
                else -> {
                    Result.failure(Exception("Session expired. Please log in again."))
                }
            }
        } catch (e: Exception) {
            Result.failure(Exception(networkErrorMessage(e)))
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun networkErrorMessage(e: Exception): String =
        when {
            e.message?.contains("Unable to resolve host") == true ->
                "Cannot reach server. Check your internet connection."
            e.message?.contains("timeout") == true ->
                "Request timed out. Please try again."
            else -> e.message ?: "An unexpected error occurred."
        }
}
