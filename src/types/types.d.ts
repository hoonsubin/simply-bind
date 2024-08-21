import React from 'react';

// Allow react to recognize the custom webkitdirectory attribute
declare module 'react' {
    interface InputHTMLAttributes<T> extends React.HTMLAttributes<T> {
      webkitdirectory?: boolean | "true" | "false";
    }
  }
  