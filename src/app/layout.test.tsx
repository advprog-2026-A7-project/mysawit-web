import React from 'react';
import RootLayout, { metadata } from './layout';
import Providers from './providers';

describe('RootLayout', () => {
  it('exports metadata', () => {
    expect(metadata.title).toBe('MySawit');
    expect(metadata.description).toBe('MySawit Palm Oil Management System');
  });

  it('wraps children in html, body, and the OAuth Providers', () => {
    const element = RootLayout({ children: <div>Child</div> }) as React.ReactElement<{
      children: React.ReactElement;
      lang: string;
    }>;
    const body = element.props.children as React.ReactElement<{
      children: React.ReactElement;
      className: string;
    }>;
    const providers = body.props.children as React.ReactElement<{ children: React.ReactElement }>;
    const child = providers.props.children as React.ReactElement<{ children: string }>;

    expect(element.type).toBe('html');
    expect(element.props.lang).toBe('en');
    expect(body.type).toBe('body');
    expect(body.props.className).toBe('antialiased');
    expect(providers.type).toBe(Providers);
    expect(child.type).toBe('div');
    expect(child.props.children).toBe('Child');
  });
});
