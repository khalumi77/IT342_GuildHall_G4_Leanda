package edu.cit.leanda.guildhall.quest

import android.graphics.BitmapFactory
import android.os.Bundle
import android.util.Base64
import android.view.ViewGroup
import android.widget.ImageView
import androidx.appcompat.app.AppCompatActivity

class ImageViewerActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val image = ImageView(this).apply {
            layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            setBackgroundColor(android.graphics.Color.BLACK)
            scaleType = ImageView.ScaleType.FIT_CENTER
        }
        setContentView(image)
        intent.getStringExtra("imageData")?.let { data ->
            val raw = data.substringAfter(",", data)
            val bytes = Base64.decode(raw, Base64.DEFAULT)
            image.setImageBitmap(BitmapFactory.decodeByteArray(bytes, 0, bytes.size))
        }
        image.setOnClickListener { finish() }
    }
}
