import React, { useState, useEffect } from 'react';
import FieldInputManager from './components/FieldInputManager';
import AdminPage from './components/AdminPage';
import ErrorBoundary from './components/ErrorBoundary';

import WireRegistrationManager from './components/WireRegistrationManager';
import EquipmentWdmManager from './components/EquipmentWdmManager';
import SettingsModal from './components/SettingsModal';
import { initialOfficeData, initialRackData, initialEquipmentData } from './data/initialData';
import { OFFICE_COLUMNS, RACK_COLUMNS, EQUIPMENT_COLUMNS } from './utils/excelUtils';
import { LayoutGrid, Server, PenTool, Settings, ShieldCheck, Cable, Cpu, Cog } from 'lucide-react'; // [수정] 아이콘 추가

// 로컬 스토리지 초기화 함수
const loadFromStorage = (key, defaultValue = []) => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    const parsed = JSON.parse(stored);
    // 배열이 아닌 경우(예: null, 객체 등) 기본값 반환
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    console.error("Storage load error", e);
    return defaultValue;
  }
};

const STORAGE_KEYS = {
  OFFICE: 'officeData_v1',
  RACK: 'rackData_v1',
  EQUIPMENT: 'equipmentData_v1',
  FIELD_INPUT: 'fieldInputData_v1',
  WIRE_INPUT: 'wireInputData_v1',
  WDM_INPUT: 'wdmInputData_v1'
};

const App = () => {
  const [activeTab, setActiveTab] = useState('field');
  // 1. Office Data
  const [officeData, setOfficeData] = useState(() => {
    return loadFromStorage(STORAGE_KEYS.OFFICE, initialOfficeData);
  });

  // 2. Rack Data
  const [rackData, setRackData] = useState(() => {
    return loadFromStorage(STORAGE_KEYS.RACK, initialRackData);
  });

  // 3. Equipment Data
  const [equipmentData, setEquipmentData] = useState(() => {
    return loadFromStorage(STORAGE_KEYS.EQUIPMENT, initialEquipmentData);
  });

  // 4. Input Rows Persistence
  const [fieldInputRows, setFieldInputRows] = useState(() => {
    return loadFromStorage(STORAGE_KEYS.FIELD_INPUT, Array.from({ length: 20 }, () => ({})));
  });
  const [wireInputRows, setWireInputRows] = useState(() => {
    return loadFromStorage(STORAGE_KEYS.WIRE_INPUT, Array.from({ length: 20 }, () => ({})));
  });
  const [wdmInputRows, setWdmInputRows] = useState(() => {
    return loadFromStorage(STORAGE_KEYS.WDM_INPUT, Array.from({ length: 20 }, () => ({})));
  });



  // 5. Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  console.log(`[App] Render - Tab: ${activeTab}, FieldRows: ${fieldInputRows.length}`);

  // 데이터 변경 시 로컬 스토리지 저장 (Debounced to improve performance)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.OFFICE, JSON.stringify(officeData));
      } catch (e) { console.error("Office data save error", e); }
    }, 1000);
    return () => clearTimeout(timer);
  }, [officeData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.RACK, JSON.stringify(rackData));
      } catch (e) { console.error("Rack data save error", e); }
    }, 1000);
    return () => clearTimeout(timer);
  }, [rackData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(equipmentData));
      } catch (e) { console.error("Equipment data save error", e); }
    }, 1000);
    return () => clearTimeout(timer);
  }, [equipmentData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.FIELD_INPUT, JSON.stringify(fieldInputRows));
      } catch (e) { console.error("Field input data save error", e); }
    }, 500); // Input is more frequent, use shorter delay
    return () => clearTimeout(timer);
  }, [fieldInputRows]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.WIRE_INPUT, JSON.stringify(wireInputRows));
      } catch (e) { console.error("Wire input data save error", e); }
    }, 500);
    return () => clearTimeout(timer);
  }, [wireInputRows]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.WDM_INPUT, JSON.stringify(wdmInputRows));
      } catch (e) { console.error("Wdm input data save error", e); }
    }, 500);
    return () => clearTimeout(timer);
  }, [wdmInputRows]);

  // [신규] 완전 초기화 핸들러 (강제 저장 및 키 변경)
  const handleFullReset = async (type) => {
    console.log(`[App] Full Reset triggered for: ${type}`);
    const emptyRows = Array.from({ length: 20 }, () => ({}));

    // 로컬 스토리지 즉시 동기화 (Debounce 우회)
    const saveKey = type === 'field' ? STORAGE_KEYS.FIELD_INPUT :
      type === 'wire' ? STORAGE_KEYS.WIRE_INPUT :
        STORAGE_KEYS.WDM_INPUT;

    try {
      localStorage.setItem(saveKey, JSON.stringify(emptyRows));
      console.log(`[App] LocalStorage cleared for ${saveKey}`);
    } catch (e) { console.error("Immediate save error", e); }

    if (type === 'field') {
      console.log("[App] Resetting field input rows");
      setFieldInputRows(emptyRows);
    } else if (type === 'wire') {
      console.log("[App] Resetting wire input rows");
      setWireInputRows(emptyRows);
    } else if (type === 'wdm') {
      console.log("[App] Resetting wdm input rows");
      setWdmInputRows(emptyRows);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="p-2 bg-blue-600 rounded-lg text-white">
                <LayoutGrid className="w-5 h-5" />
              </span>
              국사DT 실측 입력 시스템
            </h1>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all shadow-sm active:scale-95"
            >
              <Cog className="w-4 h-4 text-gray-500" />
              프린터 설정
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col">
        <div className="flex space-x-1 rounded-xl bg-gray-200 p-1 mb-6 w-fit">
          <button
            onClick={() => setActiveTab('field')}
            className={`
              flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
              ${activeTab === 'field' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-300'}
            `}
          >
            <Server className="w-4 h-4" />
            QR바코드
          </button>
          <button
            onClick={() => setActiveTab('wire')}
            className={`
              flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
              ${activeTab === 'wire' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-300'}
            `}
          >
            <Cable className="w-4 h-4" />
            선로등록
          </button>
          <button
            onClick={() => setActiveTab('wdm')}
            className={`
              flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
              ${activeTab === 'wdm' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-300'}
            `}
          >
            <Cpu className="w-4 h-4" />
            장비wdm
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`
              flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
              ${activeTab === 'admin' ? 'bg-white text-blue-800 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-300'}
            `}
          >
            <ShieldCheck className="w-4 h-4" />
            관리자 모드 (데이터 관리)
          </button>
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
          {activeTab === 'admin' && (
            <div className="h-full p-4 overflow-auto">
              <AdminPage
                officeData={officeData} setOfficeData={setOfficeData}
                rackData={rackData} setRackData={setRackData}
                equipmentData={equipmentData} setEquipmentData={setEquipmentData}
              />
            </div>
          )}

          <div style={{ display: activeTab === 'field' ? 'block' : 'none' }} className="h-full">
            <FieldInputManager
              officeData={officeData}
              rackData={rackData}
              equipmentData={equipmentData}
              inputRows={fieldInputRows}
              setInputRows={setFieldInputRows}
              onReset={() => handleFullReset('field')}
            />
          </div>

          <div style={{ display: activeTab === 'wire' ? 'block' : 'none' }} className="h-full">
            <WireRegistrationManager
              inputRows={wireInputRows}
              setInputRows={setWireInputRows}
              onReset={() => handleFullReset('wire')}
            />
          </div>

          <div style={{ display: activeTab === 'wdm' ? 'block' : 'none' }} className="h-full">
            <EquipmentWdmManager
              inputRows={wdmInputRows}
              setInputRows={setWdmInputRows}
              onReset={() => handleFullReset('wdm')}
            />
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
