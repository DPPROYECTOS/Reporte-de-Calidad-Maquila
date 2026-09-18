import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Package, Check, ChevronDown, Sparkles, Layers, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { ProductComboItem, ProductComponentItem, searchProductCatalog, PRODUCT_CATALOG } from '../data/productCatalog';
import { ComboComponentItem } from '../types/qualityReport';

interface ProductComboSearchProps {
  selectedSku: string;
  selectedDescription?: string;
  componentes?: ComboComponentItem[];
  onSelectProduct: (
    sku: string,
    desc: string,
    componentes?: ComboComponentItem[],
    claveCompuesta?: string
  ) => void;
  onUpdateComponentes?: (componentes: ComboComponentItem[]) => void;
  onUpdateDescription?: (desc: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export const ProductComboSearch: React.FC<ProductComboSearchProps> = ({
  selectedSku,
  selectedDescription = '',
  componentes = [],
  onSelectProduct,
  onUpdateComponentes,
  onUpdateDescription,
  label = 'Producto o Combo a Maquilar:',
  placeholder = 'Escribe la clave (ej. C0192-01)...',
  className = '',
}) => {
  const [query, setQuery] = useState<string>(selectedSku || '');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal query state when prop changes from outside
  useEffect(() => {
    if (selectedSku !== query) {
      setQuery(selectedSku || '');
    }
  }, [selectedSku]);

  // Click outside listener to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered suggestions based on user input
  const suggestions = searchProductCatalog(query);

  // When user types in input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setQuery(val);
    setIsOpen(true);

    // Check if the typed value exactly matches a catalog SKU
    const matched = PRODUCT_CATALOG.find(
      (item) => item.sku.toUpperCase() === val.trim().toUpperCase()
    );

    if (matched) {
      const seen = new Set<string>();
      const compItems: ComboComponentItem[] = [];
      (matched.componentes || []).forEach((c) => {
        const k = (c.sku || c.desc || '').toUpperCase().trim();
        if (!k || seen.has(k)) return;
        seen.add(k);
        compItems.push({
          sku: c.sku,
          descripcion: c.desc,
          cantidad: c.cantidad,
          unidad: c.unidad || (c.cantidad === 1 ? 'pieza' : 'piezas'),
        });
      });
      const compuesta = compItems.map((c) => c.sku).join('/');
      onSelectProduct(matched.sku, matched.desc, compItems, compuesta);
    } else {
      // Manual/custom SKU: no arrastrar componentes del SKU anterior
      onSelectProduct(val, selectedDescription || '', []);
    }
  };

  const handleSelectSuggestion = (item: ProductComboItem) => {
    setQuery(item.sku);
    setIsOpen(false);

    const seen = new Set<string>();
    const compItems: ComboComponentItem[] = [];
    (item.componentes || []).forEach((c) => {
      const k = (c.sku || c.desc || '').toUpperCase().trim();
      if (!k || seen.has(k)) return;
      seen.add(k);
      compItems.push({
        sku: c.sku,
        descripcion: c.desc,
        cantidad: c.cantidad,
        unidad: c.unidad || (c.cantidad === 1 ? 'pieza' : 'piezas'),
      });
    });
    const compuesta = compItems.map((c) => c.sku).join('/');

    onSelectProduct(item.sku, item.desc, compItems, compuesta);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery('');
    onSelectProduct('', '', []);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  // Helper to highlight matching prefix/query in SKU
  const renderHighlightedSku = (sku: string, searchStr: string) => {
    const cleanSearch = searchStr.trim();
    if (!cleanSearch) return <span className="font-mono font-bold">{sku}</span>;

    const idx = sku.toUpperCase().indexOf(cleanSearch.toUpperCase());
    if (idx === -1) return <span className="font-mono font-bold">{sku}</span>;

    const before = sku.slice(0, idx);
    const matched = sku.slice(idx, idx + cleanSearch.length);
    const after = sku.slice(idx + cleanSearch.length);

    return (
      <span className="font-mono font-bold">
        {before}
        <span className="bg-amber-200 text-amber-950 font-black px-0.5 rounded-xs underline decoration-amber-500">
          {matched}
        </span>
        {after}
      </span>
    );
  };

  // Check if current selection has components (strictly deduplicated)
  const currentComponents = React.useMemo(() => {
    const raw =
      componentes && componentes.length > 0
        ? componentes
        : (() => {
            const match = PRODUCT_CATALOG.find(
              (p) => p.sku.toUpperCase() === (selectedSku || '').trim().toUpperCase()
            );
            return (
              match?.componentes?.map((c) => ({
                sku: c.sku,
                descripcion: c.desc,
                cantidad: c.cantidad,
                unidad: c.unidad || (c.cantidad === 1 ? 'pieza' : 'piezas'),
              })) || []
            );
          })();

    const seen = new Set<string>();
    const unique: ComboComponentItem[] = [];
    for (const c of raw) {
      const k = (c.sku || c.descripcion || '').toUpperCase().trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      unique.push(c);
    }
    return unique;
  }, [componentes, selectedSku]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* 1. SECCIÓN: PRODUCTO O COMBO A MAQUILAR */}
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-black text-neutral-900 uppercase tracking-wide">
            {label}
          </label>
          <span className="text-[10px] text-neutral-500 font-medium">
            Escribe clave (ej. C0192-01)
          </span>
        </div>
      )}

      {/* Input de Búsqueda Predictiva */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-neutral-400 pointer-events-none flex items-center">
          <Search className="w-4 h-4 text-neutral-500" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="w-full pl-9 pr-16 py-2.5 bg-white border-2 border-neutral-300 focus:border-amber-500 rounded-xl text-xs sm:text-sm font-mono font-bold text-neutral-900 placeholder:font-sans placeholder:font-normal placeholder:text-neutral-400 focus:outline-hidden transition shadow-xs uppercase"
        />

        <div className="absolute right-2 flex items-center space-x-1">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-neutral-400 hover:text-neutral-700 active:scale-90 rounded-md transition"
              title="Borrar texto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-neutral-500 hover:text-neutral-800 rounded-md transition"
            title={isOpen ? 'Cerrar sugerencias' : 'Ver sugerencias'}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown de Sugerencias Predictivas */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-white border-2 border-neutral-800 rounded-2xl shadow-xl overflow-hidden max-h-64 sm:max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 bg-neutral-100 border-b border-neutral-200 flex items-center justify-between text-[11px] font-bold text-neutral-700">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {query.trim()
                  ? `Sugerencias para "${query}":`
                  : 'Catálogo de Combos y Productos Maquila:'}
              </span>
            </div>
            <span className="font-mono text-[10px] text-neutral-500">
              {suggestions.length} resultados
            </span>
          </div>

          {suggestions.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs font-bold text-neutral-800">
                No hay claves registradas con "{query}"
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Puedes continuar con la clave escrita manualmente para este lote.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {suggestions.map((item) => {
                const isCurrent =
                  selectedSku?.toUpperCase() === item.sku.toUpperCase();

                return (
                  <button
                    key={item.sku}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className={`w-full text-left p-3 flex items-start space-x-2.5 transition active:bg-amber-100 ${
                      isCurrent
                        ? 'bg-amber-50 text-neutral-900'
                        : 'hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                        isCurrent
                          ? 'bg-amber-500 border-amber-600 text-white'
                          : 'bg-neutral-100 border-neutral-300 text-neutral-400'
                      }`}
                    >
                      {isCurrent ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Package className="w-3 h-3" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="text-xs sm:text-sm text-neutral-900">
                          {renderHighlightedSku(item.sku, query)}
                        </div>
                        {item.componentes && item.componentes.length > 0 && (
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-sm shrink-0">
                            {item.componentes.length} componentes
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-600 font-normal mt-0.5 leading-snug break-words">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. AL SELECCIONAR LA CLAVE: DESCRIPCIÓN Y COMPONENTES DEL ARMADO */}
      {selectedSku && (
        <div className="mt-3 bg-neutral-50 rounded-2xl border-2 border-neutral-200 overflow-hidden shadow-xs">
          {/* Cabecera del combo seleccionado */}
          <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-amber-700 shrink-0" />
              <div className="flex items-center space-x-1.5">
                <span className="font-mono font-black text-xs sm:text-sm text-amber-950">
                  {selectedSku}
                </span>
                <span className="text-[9px] bg-amber-200 text-amber-900 font-black px-1.5 py-0.5 rounded uppercase tracking-wide">
                  Armado Activo
                </span>
              </div>
            </div>
          </div>

          {/* DESCRIPCIÓN DE LA CLAVE */}
          <div className="p-3 border-b border-neutral-200 bg-white">
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
              Descripción de la clave:
            </div>
            <p className="text-xs sm:text-sm font-bold text-neutral-900 leading-snug">
              {selectedDescription || 'Sin descripción asignada'}
            </p>
          </div>

          {/* COMPONENTES DEL ARMADO:
              clave individual -> descripcion -> cantidad de piezas individuales por armado */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-neutral-700" />
                <span className="text-[11px] font-black text-neutral-900 uppercase tracking-wide">
                  Componentes del Armado:
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500">
                {currentComponents.length} {currentComponents.length === 1 ? 'insumo' : 'insumos'}
              </span>
            </div>

            {/* Subtítulo indicativo del formato solicitado */}
            <div className="text-[9px] font-mono text-neutral-500 bg-neutral-100 px-2 py-1 rounded-md border border-neutral-200 tracking-tight">
              clave individual → descripción → cantidad de piezas individuales por armado
            </div>

            {currentComponents.length > 0 ? (
              <div className="space-y-1.5 pt-0.5">
                {currentComponents.map((comp, idx) => (
                  <div
                    key={comp.sku || idx}
                    className="p-2.5 bg-white border border-neutral-200 rounded-xl shadow-2xs hover:border-amber-300 transition"
                  >
                    {/* Disposición en fila con flechas indicativas */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      {/* Clave Individual */}
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <span className="font-mono font-black text-xs text-neutral-950 bg-neutral-100 px-2 py-1 rounded-md border border-neutral-300">
                          {comp.sku}
                        </span>
                        <ArrowRight className="w-3 h-3 text-neutral-400 shrink-0 hidden sm:inline" />
                      </div>

                      {/* Descripción */}
                      <div className="flex-1 min-w-0 sm:px-1">
                        <span className="text-xs font-semibold text-neutral-800 block leading-tight">
                          {comp.descripcion}
                        </span>
                      </div>

                      {/* Cantidad de piezas individuales por armado */}
                      <div className="flex items-center space-x-1.5 shrink-0 sm:border-l sm:border-neutral-200 sm:pl-2">
                        <ArrowRight className="w-3 h-3 text-neutral-400 shrink-0 hidden sm:inline" />
                        <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 whitespace-nowrap">
                          {comp.cantidad} {comp.unidad || (comp.cantidad === 1 ? 'pieza' : 'piezas')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-neutral-100 rounded-xl text-center border border-dashed border-neutral-300">
                <p className="text-[11px] font-medium text-neutral-600">
                  Esta clave no tiene componentes individuales desglosados en el catálogo.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
