'use client';

import DateBox from 'devextreme-react/date-box';
import SelectBox from 'devextreme-react/select-box';
import Button from 'devextreme-react/button';
import type { User } from '../../users/types';

interface OrderFiltersProps {
  startDate: Date | null;
  endDate: Date | null;
  selectedUserId: number | null;
  users: User[];
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onUserIdChange: (userId: number | null) => void;
  onClearFilters: () => void;
}

export default function OrderFilters({
  startDate,
  endDate,
  selectedUserId,
  users,
  onStartDateChange,
  onEndDateChange,
  onUserIdChange,
  onClearFilters,
}: OrderFiltersProps) {
  const userOptions = [
    { value: null, text: 'Tüm Kullanıcılar' },
    ...users.map((user) => ({
      value: user.id,
      text: `${user.name.firstname} ${user.name.lastname} (${user.username})`,
    })),
  ];

  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Filtreler</h2>
        <Button
          text="Filtreleri Temizle"
          stylingMode="outlined"
          onClick={onClearFilters}
          disabled={!startDate && !endDate && !selectedUserId}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Başlangıç Tarihi
          </label>
          <DateBox
            value={startDate}
            onValueChanged={(e) => {
              const newStartDate = e.value;
              // Eğer bitiş tarihi varsa ve yeni başlangıç tarihi bitiş tarihinden sonraysa, bitiş tarihini sıfırla
              if (newStartDate && endDate && newStartDate > endDate) {
                onEndDateChange(null);
              }
              onStartDateChange(newStartDate);
            }}
            placeholder="Başlangıç Tarihi Seçin"
            displayFormat="dd/MM/yyyy"
            max={endDate || undefined}
            validationMessage="Başlangıç tarihi bitiş tarihinden sonra olamaz"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Bitiş Tarihi
          </label>
          <DateBox
            value={endDate}
            onValueChanged={(e) => {
              const newEndDate = e.value;
              // Eğer başlangıç tarihi varsa ve yeni bitiş tarihi başlangıç tarihinden önceyse, başlangıç tarihini sıfırla
              if (newEndDate && startDate && newEndDate < startDate) {
                onStartDateChange(null);
              }
              onEndDateChange(newEndDate);
            }}
            placeholder="Bitiş Tarihi Seçin"
            displayFormat="dd/MM/yyyy"
            min={startDate || undefined}
            validationMessage="Bitiş tarihi başlangıç tarihinden önce olamaz"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Kullanıcı
          </label>
          <SelectBox
            value={selectedUserId}
            onValueChanged={(e) => onUserIdChange(e.value)}
            dataSource={userOptions}
            displayExpr="text"
            valueExpr="value"
            placeholder="Kullanıcı Seçin"
            showDropDownButton={false}
          />
        </div>
      </div>
    </div>
  );
}

