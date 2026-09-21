import React from 'react';

interface ProjectTitleProps {
  title: string;
  className?: string;
}

/**
 * ProjectTitle renders repository and project names with controlled, semantic wrapping.
 * It prevents awkward mid-word splits (e.g. "Invento / ry") by:
 * - Inserting optional word-break opportunities (<wbr />) after semantic delimiters (-, _, /)
 * - Using `overflow-wrap: normal; word-break: normal;`
 * - Restricting desktop max-width to 720px
 * - Providing 2-line clamping with full-name tooltip on hover
 */
export const ProjectTitle: React.FC<ProjectTitleProps> = ({ title, className = '' }) => {
  // Break title into segments by delimiters (-, _, /) to insert <wbr /> cleanly
  const renderFormattedTitle = (text: string) => {
    // Regex splits by delimiter while retaining the delimiter
    const parts = text.split(/([-_/])/);
    return parts.map((part, index) => {
      if (part === '-' || part === '_' || part === '/') {
        return (
          <React.Fragment key={index}>
            {part}
            <wbr />
          </React.Fragment>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <h1
      className={`font-display font-extrabold text-2xl sm:text-3xl lg:text-[2rem] text-ink tracking-tight leading-tight max-w-[720px] line-clamp-2 hover:line-clamp-none transition-all [overflow-wrap:normal] [word-break:normal] ${className}`}
      title={title}
    >
      {renderFormattedTitle(title)}
    </h1>
  );
};

export default ProjectTitle;
