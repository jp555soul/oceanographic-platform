// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

jest.mock('@wojtekmaj/react-datetimerange-picker', () => () => <div>DateTimeRangePicker</div>);
jest.mock('@deck.gl/layers', () => ({
  ScatterplotLayer: () => null,
  LineLayer: () => null,
  IconLayer: () => null,
  GeoJsonLayer: () => null,
}));
jest.mock('@deck.gl/aggregation-layers', () => ({
  HeatmapLayer: () => null,
  HexagonLayer: () => null,
}));
jest.mock('@deck.gl/geo-layers', () => ({
  TileLayer: () => null,
}));
jest.mock('react-markdown', () => () => <div>ReactMarkdown</div>);
jest.mock('remark-gfm', () => () => <div>remark-gfm</div>);
