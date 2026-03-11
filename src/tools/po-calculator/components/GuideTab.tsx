import { useLang } from '../context/LangContext';

export function GuideTab() {
  const { t } = useLang();
  const g = t.guide;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-10 text-sm text-gray-700 dark:text-gray-300">

      {/* Abbreviations */}
      <section>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-lg">🔤</span> {g.abbrevTitle}
        </h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 w-28">{g.abbrevTerm}</th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 w-48">{g.abbrevFull}</th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">{g.abbrevDesc}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {g.abbrevRows.map((row) => (
                <tr key={row.term} className="bg-white dark:bg-gray-900">
                  <td className="px-4 py-3 font-mono font-bold text-brand-700 dark:text-brand-400 whitespace-nowrap">{row.term}</td>
                  <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">{row.full}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Formulas */}
      <section>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-lg">🧮</span> {g.formulaTitle}
        </h2>
        <div className="space-y-4">
          {/* QTY */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-800 dark:text-white">
              {g.qtyTitle}
            </div>
            <div className="px-4 py-4 space-y-3">
              <div className="font-mono text-sm bg-gray-900 dark:bg-gray-950 text-green-400 rounded-lg px-4 py-3">
                QTY = max(0, AVG × (LT + D) − (SOH + OO))
              </div>
              <div className="space-y-1.5 text-gray-600 dark:text-gray-400">
                {g.qtyExplain.map((item) => (
                  <p key={item.term}>
                    <strong className="text-gray-800 dark:text-white font-mono">{item.term}</strong> {item.desc}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Projected SOH */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-800 dark:text-white">
              {g.projTitle}
            </div>
            <div className="px-4 py-4 space-y-3">
              <div className="font-mono text-sm bg-gray-900 dark:bg-gray-950 text-green-400 rounded-lg px-4 py-3">
                Projected SOH = SOH − (AVG × LT) + OO + QTY
              </div>
              <div className="space-y-1.5 text-gray-600 dark:text-gray-400">
                {g.projExplain.map((item) => (
                  <p key={item.term}>
                    <strong className="text-gray-800 dark:text-white font-mono">{item.term}</strong> {item.desc}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Worked example */}
      <section>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-lg">📋</span> {g.exampleTitle}
        </h2>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-800 dark:text-white">
            {g.exampleInputs}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-gray-100 dark:bg-gray-700">
            {[
              { label: 'AVG', value: '105' },
              { label: 'SOH', value: '200' },
              { label: 'OO',  value: '150' },
              { label: 'LT',  value: '4' },
              { label: 'D',   value: '8' },
            ].map((item) => (
              <div key={item.label} className="bg-white dark:bg-gray-900 px-4 py-3">
                <div className="font-mono font-bold text-brand-700 dark:text-brand-400 text-xs">{item.label}</div>
                <div className="text-gray-800 dark:text-white font-medium mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2.5 border-y border-gray-200 dark:border-gray-700 font-semibold text-gray-800 dark:text-white">
            {g.exampleSteps}
          </div>
          <div className="px-4 py-4 space-y-2 font-mono text-xs bg-white dark:bg-gray-900">
            <p className="text-gray-500 dark:text-gray-400">{g.coverageComment}</p>
            <p><span className="text-gray-400">QTY</span> = max(0, <span className="text-brand-600 dark:text-brand-400">105 × 12</span> − <span className="text-amber-600 dark:text-amber-400">(200 + 150)</span>)</p>
            <p className="pl-6">= max(0, <span className="text-brand-600 dark:text-brand-400">1,260</span> − <span className="text-amber-600 dark:text-amber-400">350</span>)</p>
            <p className="pl-6 font-bold text-green-600 dark:text-green-400">= 910</p>
            <div className="my-2 border-t border-gray-100 dark:border-gray-700" />
            <p><span className="text-gray-400">Projected SOH</span> = 200 − (105 × 4) + 150 + 910</p>
            <p className="pl-6">= 200 − 420 + 150 + 910</p>
            <p className="pl-6 font-bold text-green-600 dark:text-green-400">= 840</p>
            <div className="my-2 border-t border-gray-100 dark:border-gray-700" />
            <p className="text-gray-500 dark:text-gray-400">{g.validationComment}</p>
          </div>
        </div>
      </section>

      {/* Row color coding */}
      <section>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-lg">🎨</span> {g.colorTitle}
        </h2>
        <div className="space-y-2">
          {[
            { color: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700',       label: g.colorRed,    desc: g.colorRedDesc },
            { color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700', label: g.colorYellow, desc: g.colorYellowDesc },
            { color: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',          label: g.colorWhite,  desc: g.colorWhiteDesc },
          ].map((row) => (
            <div key={row.label} className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${row.color}`}>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 dark:text-white text-sm">{row.label}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{row.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Input file format */}
      <section>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-lg">📂</span> {g.inputTitle}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-3">{g.inputNote}</p>
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">{g.inputColCol}</th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">{g.inputColField}</th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">{g.inputColType}</th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">{g.inputColExample}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {g.inputRows.map((r) => (
                <tr key={r.col}>
                  <td className="px-4 py-3 font-mono font-bold text-gray-500 dark:text-gray-400">{r.col}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{r.field}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.type}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{r.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{g.inputFootnote}</p>
      </section>

    </div>
  );
}
