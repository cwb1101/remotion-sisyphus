import {createContext, useContext} from 'react';

// 同一套节组件既用于预览（Preview），也用于完整片（Full）。
// 预览模式下第二节在第 13 屏后收尾；完整片模式下继续往后演。
export type FilmMode = 'preview' | 'full';
export const FilmModeContext = createContext<FilmMode>('preview');
export const useFilmMode = () => useContext(FilmModeContext);
