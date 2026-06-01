import { useState, useCallback, useRef, useEffect } from 'react';

export interface LayoutMetrics {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 종속성 배열(dependencies)이 바뀔 때마다
 * 부모 뷰 기준의 상대 좌표 및 크기를 측정해 반환하는 커스텀 훅입니다.
 * Callback Ref 방식을 사용하여 컴포넌트의 마운트 시점을 감지합니다.
 */
export function useMeasuredLayout(dependencies: any[]) {
  const [layout, setLayout] = useState<LayoutMetrics | null>(null);
  const activeNodeRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // 타이머 추적용

  const measureNode = (node: any) => {
    // 기존에 대기 중인 측정이 있다면 취소
    if (timerRef.current) clearTimeout(timerRef.current);

    if (node && typeof node.measure === 'function') {
      timerRef.current = setTimeout(() => {
        if (activeNodeRef.current === node && typeof node.measure === 'function') {
          node.measure((x: number, y: number, width: number, height: number) => {
            setLayout({ x, y, width, height });
          });
        }
        timerRef.current = null;
      }, 50);
    }
  };

  const callbackRef = useCallback((node: any) => {
    if (node == null) {
      activeNodeRef.current = null;
      setLayout(null);
      if (timerRef.current) clearTimeout(timerRef.current); // 컴포넌트 언마운트 시 타이머 취소
      return;
    }
    activeNodeRef.current = node;
    measureNode(node);
  }, []);

  useEffect(() => {
    if (activeNodeRef.current) {
      measureNode(activeNodeRef.current);
    }
    // 훅 언마운트 시 클린업
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, dependencies);

  return [callbackRef, layout] as const;
}
