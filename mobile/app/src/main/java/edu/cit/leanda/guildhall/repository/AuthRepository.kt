package edu.cit.leanda.guildhall.repository

import edu.cit.leanda.guildhall.network.ApiService
import edu.cit.leanda.guildhall.network.GoogleLoginRequest
import edu.cit.leanda.guildhall.network.LoginRequest
import edu.cit.leanda.guildhall.network.RegisterRequest
import edu.cit.leanda.guildhall.network.UserDto

/**
 * AuthRepository wraps all authentication network calls.
 * Returns a [Result] so the ViewModel / Activity can handle success/failure cleanly.
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

    /**
     * Google OAuth login. Pass the ID token from Google Sign-In SDK.
     */
    suspend fun googleLogin(idToken: String): Result<Pair<String, UserDto>> {
        return try {
            val response = api.googleLogin(GoogleLoginRequest(idToken))
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
                    val message = envelope?.error?.message ?: "Google Sign-In failed."
                    Result.failure(Exception(message))
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