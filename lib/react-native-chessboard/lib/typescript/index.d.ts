import React from 'react';
import type { ChessboardRef } from './context/board-refs-context';
import { ChessboardProps } from './context/props-context';
declare const ChessboardContainer: React.MemoExoticComponent<React.ForwardRefExoticComponent<ChessboardProps & React.RefAttributes<ChessboardRef>>>;
export type { ChessboardRef };
export default ChessboardContainer;
