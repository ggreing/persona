"use client";
import { useEffect, useState } from "react";

export default function PersonaCard() {
  const [persona, setPersona] = useState<any | null>(null);

  const fetchPersona = async () => {
    const res = await fetch("/api/persona");
    const data = await res.json();
    setPersona(data);
  };

  useEffect(() => {
    fetchPersona();
  }, []);

  if (!persona) return <div>로딩 중...</div>;

  return (
    <div className="border rounded-xl p-4 bg-white shadow">
      <h2 className="text-primary font-bold text-lg">고객 페르소나</h2>
      <p><strong>성격:</strong> {persona.personality}</p>
      <p><strong>연령:</strong> {persona.age_group}</p>
      <p><strong>성별:</strong> {persona.gender}</p>
      <p><strong>기술수준:</strong> {persona.tech}</p>
      <p><strong>목표:</strong> {persona.goal}</p>
      <p><strong>고객유형:</strong> {persona.type}</p>
      <p><strong>사용목적:</strong> {persona.usage}</p>
    </div>
  );
}