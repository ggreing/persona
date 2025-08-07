"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Persona {
  id?: string;
  age_group: string;
  gender: string;
  tech: string;
  type: string;
  usage: string;
  goal: string;
  personality: string;
}

interface PersonaField {
  id?: string;
  value: string;
  field: keyof Persona;
  label: string;
}

const emptyPersona: Persona = {
  age_group: "",
  gender: "",
  tech: "",
  type: "",
  usage: "",
  goal: "",
  personality: "",
};

const fieldConfig = [
  { field: 'age_group' as keyof Persona, label: '연령대' },
  { field: 'gender' as keyof Persona, label: '성별' },
  { field: 'tech' as keyof Persona, label: '기술 수준' },
  { field: 'type' as keyof Persona, label: '유형' },
  { field: 'usage' as keyof Persona, label: '사용 목적' },
  { field: 'goal' as keyof Persona, label: '구매 목표' },
  { field: 'personality' as keyof Persona, label: '성격/말투' },
];

export default function AdminPersonaPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [form, setForm] = useState<Persona>(emptyPersona);
  const [loading, setLoading] = useState(false);
  const [activeField, setActiveField] = useState<keyof Persona | null>(null);
  const [fieldValues, setFieldValues] = useState<{ [key: string]: string[] }>({});
  const router = useRouter();

  // 로그인 상태 확인
  useEffect(() => {
    const uid = localStorage.getItem("user_id");
    if (!uid) {
      router.push("/login");
    }
  }, [router]);

  const loadPersonas = () => {
    setLoading(true);
    fetch("/api/persona")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPersonas(data);
          // 각 필드별로 고유한 값들을 추출
          const fieldData: { [key: string]: string[] } = {};
          fieldConfig.forEach(({ field }) => {
            const values = [...new Set(data.map(p => p[field]).filter(Boolean))];
            fieldData[field] = values;
          });
          setFieldValues(fieldData);
        } else if (data && typeof data === "object") {
          setPersonas([data]);
        } else {
          setPersonas([]);
        }
      })
      .finally(() => setLoading(false));
  };

  const loadFieldValues = async (field: keyof Persona) => {
    try {
      const res = await fetch(`/api/persona/field?field=${field}`);
      const values = await res.json();
      if (Array.isArray(values)) {
        setFieldValues(prev => ({ ...prev, [field]: values }));
      }
    } catch (error) {
      console.error(`Failed to load ${field} values:`, error);
    }
  };

  useEffect(() => {
    loadPersonas();
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/persona", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(emptyPersona);
    loadPersonas();
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    await fetch(`/api/persona?id=${id}`, { method: "DELETE" });
    loadPersonas();
  };

  const handleAddFieldValue = async (field: keyof Persona, value: string) => {
    if (!value.trim()) return;
    
    try {
      await fetch(`/api/persona/field?field=${field}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      
      // 해당 필드의 값들을 다시 로드
      await loadFieldValues(field);
      // 전체 페르소나도 다시 로드
      loadPersonas();
    } catch (error) {
      console.error(`Failed to add ${field} value:`, error);
    }
  };

  const handleDeleteFieldValue = async (field: keyof Persona, value: string) => {
    try {
      await fetch(`/api/persona/field?field=${field}&value=${encodeURIComponent(value)}`, {
        method: "DELETE",
      });
      
      // 해당 필드의 값들을 다시 로드
      await loadFieldValues(field);
      // 전체 페르소나도 다시 로드
      loadPersonas();
    } catch (error) {
      console.error(`Failed to delete ${field} value:`, error);
    }
  };

  const FieldManager = ({ field, label }: { field: keyof Persona; label: string }) => {
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const values = fieldValues[field] || [];

    const handleAdd = async () => {
      if (!inputValue.trim()) return;
      setIsLoading(true);
      try {
        await handleAddFieldValue(field, inputValue);
        setInputValue("");
      } finally {
        setIsLoading(false);
      }
    };

    const handleDelete = async (value: string) => {
      setIsLoading(true);
      try {
        await handleDeleteFieldValue(field, value);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">{label} 관리</h3>
        
        {/* 입력 폼 */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`새로운 ${label} 추가`}
            className="flex-1 border border-gray-300 rounded px-3 py-2"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !isLoading) {
                handleAdd();
              }
            }}
            disabled={isLoading}
          />
          <button
            onClick={handleAdd}
            disabled={isLoading || !inputValue.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? '추가 중...' : '추가'}
          </button>
        </div>

        {/* 값 목록 */}
        <div className="space-y-2">
          {values.map((value, index) => (
            <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
              <span className="text-gray-700">{value}</span>
              <button
                onClick={() => handleDelete(value)}
                disabled={isLoading}
                className="text-red-600 hover:text-red-800 text-sm disabled:text-gray-400"
              >
                {isLoading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          ))}
          {values.length === 0 && (
            <p className="text-gray-500 text-sm">등록된 {label}가 없습니다.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-xl shadow">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">고객 페르소나 관리</h2>
      
      {/* 전체 페르소나 등록 폼 */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">전체 페르소나 등록</h3>
        <form className="flex flex-wrap gap-2 items-end" onSubmit={handleAdd}>
          <input className="border p-1 rounded" name="age_group" value={form.age_group} onChange={handleInput} placeholder="연령대" required />
          <input className="border p-1 rounded" name="gender" value={form.gender} onChange={handleInput} placeholder="성별" required />
          <input className="border p-1 rounded" name="tech" value={form.tech} onChange={handleInput} placeholder="기술 수준" required />
          <input className="border p-1 rounded" name="type" value={form.type} onChange={handleInput} placeholder="유형" required />
          <input className="border p-1 rounded" name="usage" value={form.usage} onChange={handleInput} placeholder="사용 목적" required />
          <input className="border p-1 rounded" name="goal" value={form.goal} onChange={handleInput} placeholder="구매 목표" required />
          <input className="border p-1 rounded" name="personality" value={form.personality} onChange={handleInput} placeholder="성격/말투" required />
          <button className="bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-800" type="submit">저장</button>
        </form>
      </div>

      {/* 각 필드별 관리 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {fieldConfig.map(({ field, label }) => (
          <FieldManager key={field} field={field} label={label} />
        ))}
      </div>
    </div>
  );
}
