/**
 * @file useMeasuredLayout.ts
 * @description 뷰 노드의 절대 좌표 및 뷰포트 크기를 측정하는 커스텀 훅입니다.
 * - React Native의 `node.measure` 메소드를 활용해 디바이스 화면 기준의 pageX, pageY 좌표를 수집합니다.
 * - Callback Ref 방식을 사용해 노드가 실제 렌더링에 마운트되는 적절한 시점에 정밀 측정이 이루어지도록 돕습니다.
 */
import { useState, useCallback, useRef, useEffect } from 'react';

export interface LayoutMetrics {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 종속성 배열(dependencies)이 바뀔 때마다
 * 절대 좌표 및 크기를 측정하고 상태를 업데이트하는 커스텀 훅입니다.
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
          node.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
            setLayout({ x: pageX, y: pageY, width, height });
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
