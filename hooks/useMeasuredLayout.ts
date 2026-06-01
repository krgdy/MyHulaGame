import { useState, useCallback, useRef, useEffect } from 'react';

export interface LayoutMetrics {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 컴포넌트의 Ref를 할당받아, 종속성 배열(dependencies)이 바뀔 때마다
 * 부모 뷰 기준의 상대 좌표 및 크기를 네이티브 레벨에서 측정해 반환하는 커스텀 훅입니다.
 * Callback Ref 방식을 사용하여 컴포넌트의 마운트 시점을 정확하게 감지합니다.
 */
export function useMeasuredLayout(dependencies: any[]) {
  const [layout, setLayout] = useState<LayoutMetrics | null>(null);
  
  const timerRef = useRef<number | null>(null);
  // 엣지 케이스 방어용 useRef
  const activeNodeRef = useRef<any>(null);

  const callbackRef = useCallback((node: any) => {
    // 이전 대기 중인 타이머가 있다면 클린업하여 중복 실행 방지
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (node == null){
      // 컴포넌트가 언마운트되면 레이아웃 값을 초기화
      setLayout(null);
      return;
    }
    activeNodeRef.current = node;


    if (typeof node.measure === 'function') {
      timerRef.current = setTimeout(() => {
        if (activeNodeRef.current && typeof activeNodeRef.current.measure === 'function') {
          activeNodeRef.current.measure((x: number, y: number, width: number, height: number) => {
            setLayout({ x, y, width, height });
          });
        }
      }, 50);
    }

  }, dependencies);

  return [callbackRef, layout] as const;
}
