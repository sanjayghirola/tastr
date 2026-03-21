import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';

export function PickupReadyPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const restaurant = state?.restaurant;

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-24 h-24 rounded-full bg-[#FAF0E0] border-4 border-[#C18B3C] flex items-center justify-center text-5xl mb-6 shadow-lg">
        🍽️
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Your order is ready!</h1>
      <p className="text-gray-500 text-sm mb-8 max-w-xs">
        Head to the restaurant to collect your order. Show the staff your order number.
      </p>

      {restaurant && (
        <div className="w-full max-w-sm bg-white rounded-2xl border border-[#E8D9C0] p-4 mb-6 text-left shadow-sm">
          <p className="font-semibold text-gray-800 mb-1">{restaurant.name}</p>
          <p className="text-sm text-gray-500">{restaurant.address}</p>
          {/* Map pin placeholder */}
          <div className="mt-3 h-32 rounded-xl bg-[#EDE0CC] flex items-center justify-center text-3xl">
            📍
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <a
          href={restaurant?.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(restaurant?.address || '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 rounded-2xl bg-[#C18B3C] text-white font-semibold text-sm hover:bg-[#a97430] transition-colors text-center"
        >
          Get Directions
        </a>
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 rounded-2xl border border-[#E8D9C0] text-gray-600 font-semibold text-sm hover:bg-[#EDE0CC] transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

export function PickupCompletePage() {
  const navigate  = useNavigate();
  const { state } = useLocation();
  const orderId   = state?.orderId;
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  function submitRating() {
    if (orderId && rating > 0) {
      api.post(`/reviews`, { orderId, targetType: 'restaurant', rating }).catch(() => {});
    }
    setSubmitted(true);
    setTimeout(() => navigate('/'), 1500);
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-green-50 border-4 border-green-400 flex items-center justify-center text-5xl shadow-lg">
          ✅
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-[#C18B3C] flex items-center justify-center text-white text-lg animate-bounce">
          🎉
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-2">Picked up!</h1>
      <p className="text-gray-500 text-sm mb-8 max-w-xs">
        Enjoy your meal! How was the experience?
      </p>

      {!submitted ? (
        <div className="w-full max-w-sm bg-white rounded-2xl border border-[#E8D9C0] p-6 shadow-sm mb-6">
          <p className="font-semibold text-gray-700 mb-4">Rate your order</p>
          <div className="flex justify-center gap-3 mb-6">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={`text-3xl transition-transform hover:scale-110 ${n <= rating ? 'grayscale-0' : 'grayscale opacity-40'}`}
              >
                ⭐
              </button>
            ))}
          </div>
          <button
            onClick={submitRating}
            disabled={rating === 0}
            className="w-full py-3 rounded-2xl bg-[#C18B3C] text-white font-semibold text-sm disabled:opacity-40 hover:bg-[#a97430] transition-colors"
          >
            Submit Rating
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-green-700 font-semibold">
          Thanks for your feedback! 🙏
        </div>
      )}

      <button
        onClick={() => navigate('/')}
        className="text-sm text-[#C18B3C] underline"
      >
        Back to Home
      </button>
    </div>
  );
}

