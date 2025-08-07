import { motion } from "framer-motion";

interface Msg {
  role: "seller" | "ai";
  content: string;
}

export default function MessageList({ items }: { items?: Msg[] }) {
  if (!items || items.length === 0) {
    return <div className="text-gray-400 italic">아직 대화가 없습니다.</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {items.map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded shadow ${
            m.role === "ai"
              ? "bg-blue-50 text-blue-800 self-start"
              : "bg-gray-100 text-gray-900 self-end"
          }`}
        >
          {m.content}
        </motion.div>
      ))}
    </div>
  );
}
