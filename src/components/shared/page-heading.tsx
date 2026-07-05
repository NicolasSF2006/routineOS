interface PageHeadingProps {
  title: string
  description: string
}

export function PageHeading({ title, description }: PageHeadingProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

