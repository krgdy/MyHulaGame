import { useState, useEffect, useRef } from 'react';

export interface LayoutMetrics {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 컴포넌트의 Ref를 할당받아, 종속성 배열(dependencies)이 바뀔 때마다
 * 부모 뷰 기준의 상대 좌표 및 크기를 네이티브 레벨에서 측정해 반환하는 커스텀 훅입니다.
 */
export function useMeasuredLayout(dependencies: any[]) {
  const ref = useRef<any>(null);
  const [layout, setLayout] = useState<LayoutMetrics | null>(null);

  useEffect(() => {
    // 렌더링 후 레이아웃 엔진이 연산을 끝마칠 시간을 확보하기 위해 미세한 지연(50ms) 부여
    const timer = setTimeout(() => {
      if (ref.current && typeof ref.current.measure === 'function') {
        ref.current.measure((x: number, y: number, width: number, height: number) => {
          setLayout({ x, y, width, height });
        });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, dependencies);

  return [ref, layout] as const;
}
