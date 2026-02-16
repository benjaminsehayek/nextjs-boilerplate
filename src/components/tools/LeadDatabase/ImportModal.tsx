'use client';

import { useState } from 'react';
import type { Contact, ImportMapping, ContactSource } from './types';
import { parseCSV, detectMarket, calculateELV } from './utils';

interface ImportModalProps {
  onImport: (contacts: Partial<Contact>[]) => void;
  onCancel: () => void;
}

export default function ImportModal({ onImport, onCancel }: ImportModalProps) {
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<ImportMapping[]>([]);
  const [previewContacts, setPreviewContacts] = useState<Partial<Contact>[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseCSV(content);

      if (parsed.length < 2) {
        alert('CSV file must have at least a header row and one data row');
        return;
      }

      setCsvData(parsed);

      // Initialize mappings with header row
      const headers = parsed[0];
      const initialMappings: ImportMapping[] = headers.map((header) => ({
        csvColumn: header,
        contactField: autoMapField(header),
      }));
      setMappings(initialMappings);

      setStep('map');
    };
    reader.readAsText(file);
  };

  const autoMapField = (header: string): keyof Contact | 'skip' => {
    const lower = header.toLowerCase().trim();

    const fieldMap: Record<string, keyof Contact> = {
      'first name': 'firstName',
      'firstname': 'firstName',
      'last name': 'lastName',
      'lastname': 'lastName',
      'email': 'email',
      'phone': 'phone',
      'company': 'company',
      'address': 'address',
      'city': 'city',
      'state': 'state',
      'zip': 'zip',
      'source': 'source',
      'notes': 'notes',
    };

    return fieldMap[lower] || 'skip';
  };

  const handleMappingChange = (index: number, field: keyof Contact | 'skip') => {
    const newMappings = [...mappings];
    newMappings[index].contactField = field;
    setMappings(newMappings);
  };

  const handlePreview = () => {
    const contacts: Partial<Contact>[] = [];

    // Skip header row
    for (let i = 1; i < csvData.length; i++) {
      const row = csvData[i];
      const contact: any = {
        tags: [],
        lists: [],
        emailOptIn: false,
        smsOptIn: false,
      };

      mappings.forEach((mapping, idx) => {
        if (mapping.contactField !== 'skip' && row[idx]) {
          contact[mapping.contactField] = row[idx].trim();
        }
      });

      // Set default source if not provided
      if (!contact.source) {
        contact.source = 'other';
      }

      // Detect market
      const market = detectMarket(contact);
      contact.marketId = market.id;
      contact.marketName = market.name;

      // Calculate ELV
      const { elv, factors } = calculateELV(contact);
      contact.elv = elv;
      contact.elvFactors = factors;

      // Set timestamps
      const now = new Date().toISOString();
      contact.createdAt = now;
      contact.updatedAt = now;

      contacts.push(contact);
    }

    setPreviewContacts(contacts);
    setStep('preview');
  };

  const handleImport = () => {
    onImport(previewContacts);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-char-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-display text-gradient-flame">
                Import Contacts
              </h2>
              <p className="text-sm text-ash-400 mt-1">
                {step === 'upload' && 'Upload a CSV file'}
                {step === 'map' && 'Map CSV columns to contact fields'}
                {step === 'preview' && 'Preview and confirm import'}
              </p>
            </div>
            <button onClick={onCancel} className="btn-icon">
              ✕
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="border-b border-char-700 px-6 py-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex-1 h-1 rounded ${
                step === 'upload'
                  ? 'bg-flame-500'
                  : 'bg-char-600'
              }`}
            />
            <div
              className={`flex-1 h-1 rounded ${
                step === 'map' || step === 'preview'
                  ? 'bg-flame-500'
                  : 'bg-char-600'
              }`}
            />
            <div
              className={`flex-1 h-1 rounded ${
                step === 'preview'
                  ? 'bg-flame-500'
                  : 'bg-char-600'
              }`}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-display mb-4 text-ash-200">
                Upload CSV File
              </h3>
              <p className="text-ash-400 mb-6">
                Select a CSV file containing your contacts
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="btn-primary cursor-pointer">
                Choose File
              </label>
              <div className="mt-8 text-left max-w-md mx-auto">
                <h4 className="text-sm font-display uppercase text-ash-400 mb-2">
                  CSV Format Tips
                </h4>
                <ul className="text-sm text-ash-500 space-y-1">
                  <li>• First row should contain column headers</li>
                  <li>• Include at least: first name, email, or phone</li>
                  <li>• Supported columns: first name, last name, email, phone, company, city, state, etc.</li>
                  <li>• File should be in UTF-8 encoding</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'map' && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-display text-ash-200 mb-2">
                  Map Columns
                </h3>
                <p className="text-sm text-ash-400">
                  Match your CSV columns to contact fields
                </p>
              </div>

              <div className="space-y-2">
                {mappings.map((mapping, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 bg-char-700 rounded"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-ash-200">
                        {mapping.csvColumn}
                      </div>
                      <div className="text-xs text-ash-500">
                        Sample: {csvData[1]?.[index] || 'N/A'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-ash-500">→</span>
                      <select
                        value={mapping.contactField}
                        onChange={(e) =>
                          handleMappingChange(
                            index,
                            e.target.value as keyof Contact | 'skip'
                          )
                        }
                        className="input min-w-[200px]"
                      >
                        <option value="skip">Skip</option>
                        <option value="firstName">First Name</option>
                        <option value="lastName">Last Name</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="company">Company</option>
                        <option value="address">Address</option>
                        <option value="city">City</option>
                        <option value="state">State</option>
                        <option value="zip">ZIP Code</option>
                        <option value="source">Source</option>
                        <option value="notes">Notes</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-display text-ash-200 mb-2">
                  Preview Import
                </h3>
                <p className="text-sm text-ash-400">
                  {previewContacts.length} contact{previewContacts.length !== 1 ? 's' : ''} ready to import
                </p>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {previewContacts.slice(0, 10).map((contact, index) => (
                  <div
                    key={index}
                    className="p-3 bg-char-700 rounded flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-ash-200">
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div className="text-xs text-ash-500 space-x-2">
                        {contact.email && <span>📧 {contact.email}</span>}
                        {contact.phone && <span>📱 {contact.phone}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-display text-flame-500">
                        ${contact.elv?.toLocaleString()}
                      </div>
                      <div className="text-xs text-ash-500">
                        {contact.marketName}
                      </div>
                    </div>
                  </div>
                ))}
                {previewContacts.length > 10 && (
                  <div className="text-center text-sm text-ash-500 py-2">
                    + {previewContacts.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-char-700 p-4 flex justify-between">
          <button onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <div className="flex gap-2">
            {step === 'map' && (
              <button
                onClick={() => setStep('upload')}
                className="btn-ghost"
              >
                Back
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={() => setStep('map')}
                className="btn-ghost"
              >
                Back
              </button>
            )}
            {step === 'map' && (
              <button onClick={handlePreview} className="btn-primary">
                Preview
              </button>
            )}
            {step === 'preview' && (
              <button onClick={handleImport} className="btn-primary">
                Import {previewContacts.length} Contact{previewContacts.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
