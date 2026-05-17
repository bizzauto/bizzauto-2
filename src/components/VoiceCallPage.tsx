import { Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react'
import { useState } from 'react'

export default function VoiceCallPage() {
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [duration, setDuration] = useState(0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Voice Calls</h1>
        <p className="text-gray-500 dark:text-gray-400">Make and receive voice calls</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 text-center">
        <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Phone size={40} className="text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {isCallActive ? 'Call in Progress' : 'Ready to Call'}
        </h3>
        {isCallActive && (
          <p className="text-2xl font-mono mb-4">
            {Math.floor(duration / 60).toString().padStart(2, '0')}:
            {(duration % 60).toString().padStart(2, '0')}
          </p>
        )}

        <div className="flex justify-center gap-4 mt-6">
          {isCallActive ? (
            <>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-4 rounded-full ${isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 dark:bg-gray-700'}`}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <button
                onClick={() => {
                  setIsCallActive(false)
                  setDuration(0)
                }}
                className="p-4 rounded-full bg-red-600 text-white"
              >
                <PhoneOff size={24} />
              </button>
              <button className="p-4 rounded-full bg-gray-100 dark:bg-gray-700">
                <Volume2 size={24} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsCallActive(true)}
              className="px-8 py-3 bg-green-600 text-white rounded-full flex items-center gap-2"
            >
              <Phone size={20} />
              Start Call
            </button>
          )}
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Voice calling requires Twilio or similar integration. Configure in Settings.
        </p>
      </div>
    </div>
  )
}
