"use client";

interface Props {
  persona: {
    age_group: string;
    gender: string;
    personality: string;
    tech: string;
    goal: string;
    usage: string;
    type: string;
  };
  onConfirm: () => void;
}

export default function PersonaConfirm({ persona, onConfirm }: Props) {
  return (
    <div className="max-w-2xl mx-auto py-10 space-y-4 text-center">
      <h2 className="text-xl font-bold text-blue-800">고객 페르소나 확정</h2>
      <div className="bg-gray-50 rounded p-6 text-left shadow inline-block">
        <div>🧑‍💼 <b>{persona.age_group} {persona.gender}</b> ({persona.type})</div>
        <div>성격: {persona.personality}</div>
        <div>기술 수준: {persona.tech}</div>
        <div>구매 목적: {persona.goal}</div>
        <div>사용 목적: {persona.usage}</div>
      </div>
      <button
        className="mt-6 bg-blue-600 text-white px-6 py-3 rounded font-bold hover:bg-blue-800 text-lg"
        onClick={onConfirm}
      >
        이 페르소나로 대화 시작
      </button>
    </div>
  );
}
