package edu.cit.leanda.guildhall.quest

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import edu.cit.leanda.guildhall.R
import edu.cit.leanda.guildhall.auth.QuestDto
import java.text.NumberFormat
import java.util.Locale

class QuestListAdapter(
    private val currentUserId: Long,
    private val readOnly: Boolean = false
) : RecyclerView.Adapter<QuestListAdapter.Holder>() {
    private var data = listOf<QuestDto>()
    var onClick: ((QuestDto) -> Unit)? = null
    var onPay: ((QuestDto) -> Unit)? = null

    fun update(items: List<QuestDto>) {
        data = items
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        return Holder(LayoutInflater.from(parent.context).inflate(R.layout.item_quest_card, parent, false))
    }

    override fun getItemCount(): Int = data.size

    override fun onBindViewHolder(holder: Holder, position: Int) {
        holder.bind(data[position], currentUserId, readOnly, onClick, onPay)
    }

    class Holder(view: View) : RecyclerView.ViewHolder(view) {
        fun bind(q: QuestDto, me: Long, readOnly: Boolean, click: ((QuestDto) -> Unit)?, pay: ((QuestDto) -> Unit)?) {
            itemView.findViewById<TextView>(R.id.tvTitle).text = q.title
            itemView.findViewById<TextView>(R.id.tvCategory).text = q.category.uppercase()
            val helper = q.helperUsername ?: q.helperUsernameAlt
            val postedLine = when {
                readOnly -> "Commissioned by ${q.posterUsername ?: q.postedBy}"
                helper != null -> "Accepted by $helper"
                else -> q.guildName ?: "Waiting for an adventurer..."
            }
            itemView.findViewById<TextView>(R.id.tvPostedBy).text = postedLine
            itemView.findViewById<TextView>(R.id.tvDescription).text = q.description
            val rewardValue = q.reward
            itemView.findViewById<TextView>(R.id.tvReward).text = if (q.questType == "PAID" && rewardValue != null) NumberFormat.getCurrencyInstance(Locale("en", "PH")).format(rewardValue) else "Volunteer"
            itemView.findViewById<TextView>(R.id.tvXp).text = "+${q.xpReward} XP"
            bindStatus(itemView.findViewById(R.id.tvStatus), q.status)
            itemView.findViewById<TextView>(R.id.tvBadge).visibility = View.GONE
            itemView.findViewById<TextView>(R.id.btnDelete).visibility = View.GONE
            val primary = itemView.findViewById<MaterialButton>(R.id.btnPrimary)
            if (!readOnly && q.status == "PENDING_PAYMENT") {
                primary.visibility = View.VISIBLE
                primary.text = "Pay to Publish"
                primary.setOnClickListener { pay?.invoke(q) }
            } else if (!readOnly && q.posterId == me && q.status == "PENDING") {
                primary.visibility = View.VISIBLE
                primary.text = "Done"
            } else {
                primary.visibility = View.GONE
            }
            itemView.setOnClickListener { click?.invoke(q) }
        }

        private fun bindStatus(view: TextView, status: String) {
            view.text = status.replace("_", " ")
            when (status) {
                "OPEN" -> { view.setBackgroundResource(R.drawable.bg_chip_green); view.setTextColor(android.graphics.Color.rgb(22, 101, 52)) }
                "COMPLETED" -> { view.setBackgroundResource(R.drawable.bg_chip_blue); view.setTextColor(android.graphics.Color.rgb(30, 64, 175)) }
                else -> { view.setBackgroundResource(R.drawable.bg_chip_amber); view.setTextColor(android.graphics.Color.rgb(146, 64, 14)) }
            }
        }
    }
}
