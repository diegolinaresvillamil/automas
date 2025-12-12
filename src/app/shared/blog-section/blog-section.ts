import { Component, Input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface BlogPost {
  id?: string;
  title: string;
  tag?: string;
  excerpt?: string;
  image: string;
  url: string;
}

@Component({
  selector: 'app-blog-section',
  standalone: true, // 👈 IMPORTANTE
  imports: [NgFor, NgIf, RouterLink],
  templateUrl: './blog-section.html',
  styleUrl: './blog-section.css'
})
export class BlogSectionComponent {
  @Input() heading = 'Blog';
  @Input({ required: true }) posts: BlogPost[] = [];
}
