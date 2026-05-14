package edu.cit.leanda.guildhall.auth

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Singleton Retrofit client.
 *
 * BASE_URL points to the same Spring Boot backend used by the web app.
 * Change to your machine's LAN IP when testing on a real device.
 * (10.0.2.2 is the Android emulator's alias for localhost)
 */
object RetrofitClient {

    // ⚠️ Using LAN IP for physical device testing — change as needed
    private const val BASE_URL = "http://192.168.1.10:8080/api/v1/"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY   // change to NONE for release
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    val apiService: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }

    /** The base URL without the /api/v1/ suffix — used to build the Google OAuth init URL. */
    val serverBaseUrl: String = BASE_URL.removeSuffix("api/v1/")
}