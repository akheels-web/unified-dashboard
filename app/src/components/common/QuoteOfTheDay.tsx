import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Quote, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const quotes = [
    { text: "The significant problems we have cannot be solved at the same level of thinking with which we created them.", author: "Albert Einstein" },
    { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
    { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
    { text: "Code is like humor. When you have to explain it, it’s bad.", author: "Cory House" },
    { text: "Fix the cause, not the symptom.", author: "Steve McConnell" },
    { text: "Optimism is an occupational hazard of programming: feedback is the treatment.", author: "Kent Beck" },
    { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
    { text: "Java is to JavaScript what car is to Carpet.", author: "Chris Heilmann" },
    { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
    { text: "Programming isn't about what you know; it's about what you can figure out.", author: "Chris Pine" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "It’s not a bug – it’s an undocumented feature.", author: "Anonymous" },
    { text: "Walking on water and developing software from a specification are easy if both are frozen.", author: "Edward V. Berard" },
    { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
    { text: "Technology is best when it brings people together.", author: "Matt Mullenweg" },
];

export function QuoteOfTheDay() {
    const [quote, setQuote] = useState(quotes[0]);

    useEffect(() => {
        // Pick a random quote based on the day of the year to keep it consistent for the day
        // Or just random on mount. Let's do random on mount for more variety on refresh.
        const randomIndex = Math.floor(Math.random() * quotes.length);
        setQuote(quotes[randomIndex]);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-6 relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Quote className="w-24 h-24 text-primary transform rotate-12" />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center gap-2 mb-4 text-primary">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Quote of the Day</span>
                </div>

                <blockquote className="text-lg md:text-xl font-medium text-foreground italic mb-4">
                    "{quote.text}"
                </blockquote>

                <cite className="text-sm text-muted-foreground not-italic font-medium">
                    — {quote.author}
                </cite>
            </div>
        </motion.div>
    );
}
